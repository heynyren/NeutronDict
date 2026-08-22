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
    if (typeof d === "string") { try { return JSON.parse(d); } catch (e) { throw new Error(T("Máy chủ trả về dữ liệu không đọc được")); } }
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
    if (typeof d === "string") { try { return JSON.parse(d); } catch (e) { throw new Error(T("Dữ liệu không đọc được")); } }
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
  noun: T("danh từ"), verb: T("động từ"), adjective: T("tính từ"), adverb: T("trạng từ"),
  pronoun: T("đại từ"), preposition: T("giới từ"), conjunction: T("liên từ"), interjection: T("thán từ"),
  exclamation: T("thán từ"), determiner: T("từ hạn định"), article: T("mạo từ"), numeral: T("số từ"),
  "proper noun": T("danh từ riêng"), "auxiliary verb": T("trợ động từ"), particle: T("tiểu từ"),
  prefix: T("tiền tố"), suffix: T("hậu tố"), abbreviation: T("viết tắt"), phrase: T("cụm từ")
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
  if (!out) throw new Error(T("gtx rỗng"));
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
  // Giọng theo ngôn ngữ đang bật — đọc 「犬」 bằng giọng tiếng Anh thì ra một
  // thứ không ai nghe được.
  const ma = laNhat() ? "ja-JP" : "en-US";
  try {
    if (Plugins.TextToSpeech) { await Plugins.TextToSpeech.speak({ text, lang: ma, rate: 0.9 }); return; }
  } catch (e) { /* thử fallback */ }
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = ma; u.rate = 0.9;
    const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith(ma.slice(0, 2)));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) { /* máy không có giọng thứ tiếng đó */ }
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
/** Ngôn ngữ mà bản tiến độ đang giữ trong bộ nhớ thuộc về. */
let nguDaNap = "";
const laNhat = () => NGU === "ja";

async function napNgu() {
  NGU = window.Ngu.hopLe(await Store.get("ngu"));
  return NGU;
}

/* ==================================================================== */
/* Ngôn ngữ giao diện                                                    */
/* ==================================================================== */
/*
 * Khác hẳn nút EN→V / 日→V: cái đó chọn TỪ ĐIỂN nào, còn cái này chỉ đổi chữ
 * trên màn hình. Một người Nhật học tiếng Việt vẫn có thể để giao diện tiếng
 * Nhật mà tra Việt–Anh.
 */
async function napChu() {
  const c = window.Chu.hopLe(await Store.get("chu"));
  const o = $("chuNgu");
  if (o) o.value = c;
  window.Chu.dat(c);
  return c;
}
async function doiChu(c) {
  const moi = window.Chu.hopLe(c);
  await Store.set("chu", moi);
  window.Chu.dat(moi);
  // Chữ do JS dựng ra không nằm trong lượt quét data-chu — vẽ lại các màn.
  veNgu();
  drawNotebook();
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

/** Bỏ bản mô tả ảnh khỏi bản sắp gửi lên Drive. Xem doSync. */
function boAnh(nb) {
  const ra = {};
  for (const k in (nb || {})) {
    const e = nb[k];
    if (e && e.anh) { const b = Object.assign({}, e); delete b.anh; ra[k] = b; }
    else ra[k] = e;
  }
  return ra;
}
/** Trả lại bản mô tả ảnh của máy này vào bản vừa trộn từ Drive. */
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
  return window.Muc.tron(a, b);
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
    // `srs.ts` là mốc của LẦN CHẤM này, tách khỏi mốc sửa của cả mục. Xem Muc.gopSrs.
    nb[key] = Object.assign({}, e, { srs: { lv, due, ts: now }, ts: now });
  });
}
/**
 * Cấp của một mục, nói theo cách người học đọc được. Bên trong đếm từ -1, ra
 * ngoài đếm từ 1 — "cấp 0" đọc lên chẳng ai biết là đã học hay chưa.
 */
function tenCap(srs) {
  if (!srs || typeof srs.lv !== "number") return T("Chưa học");
  if (srs.lv < 0) return T("Về lại đầu");
  return T2("Cấp {n}", { n: srs.lv + 1 });
}

/** Bao giờ ôn lại: "đến hạn" / "mai" / "còn 5 ngày" / "còn ~3 tháng". */
function khiNaoOn(due, now) {
  if (!due || due <= now) return T("đến hạn");
  const ngay = Math.ceil((due - now) / DAY);
  if (ngay <= 1) return T("mai");
  if (ngay < 30) return T2("còn {n} ngày", { n: ngay });
  return T2("còn ~{n} tháng", { n: Math.round(ngay / 30) });
}

/** Một dòng gọn: "Cấp 3 · còn 5 ngày". */
function chuCap(it, now) {
  return tenCap(it.srs) + " · " + khiNaoOn(it.srs && it.srs.due, now);
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
  //
  // Ghi theo nguDaNap — ngôn ngữ mà bản đang giữ trong bộ nhớ thuộc về — chứ
  // KHÔNG theo NGU. Ghi theo NGU thì chỉ cần một lượt ghi rơi vào lúc vừa đổi
  // ngôn ngữ là tiến độ bên này chui sang ngăn bên kia.
  doc: async () => {
    nguDaNap = NGU;
    return window.Ngu.tachHoc(await Store.get("hoc"))[NGU];
  },
  ghi: async (d) => {
    const cu = window.Ngu.tachHoc(await Store.get("hoc"));
    await Store.set("hoc", Object.assign({}, cu, { [nguDaNap || NGU]: d }));
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

/* ====================================================================== */
/* Furigana                                                               */
/* ====================================================================== */
/*
 * Mazii cho cách đọc của phần lớn từ, nhưng không phải tất cả — và chỗ nó cho
 * cũng không đồng nhất: 「金融」 ra きんゆう, còn 「奪われます」 lại ra
 * "Ubawa remasu". Mục nằm trong sổ mà không đọc nổi thì đến buổi ôn là bỏ qua.
 * Xem kana.js. Giống hệt bên extension, cố ý — hai bên dùng chung một sổ.
 */

/** Có phải văn bản tiếng Nhật không (hiragana/katakana/kanji)? */
function hasJapanese(s) { return /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(s || ""); }

const kanaDem = new Map();
let dangVaFurigana = false;   // khoá, kẻo vá xong vẽ lại rồi lại vá tiếp thành vòng lặp

/** Phiên âm La-tinh của một chuỗi tiếng Nhật, lấy từ endpoint gtx (dt=rm). */
async function romajiCua(text) {
  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=rm"
    + "&sl=ja&tl=vi&q=" + encodeURIComponent(text);
  const data = await httpGetJson(url);
  // Google để phiên âm nguồn ở phần tử [3] của đoạn cuối (chỗ [0] rỗng).
  let rm = "";
  for (const seg of ((data && data[0]) || [])) {
    if (seg && seg[0] == null && typeof seg[3] === "string") rm += seg[3];
  }
  return rm.replace(/\s+/g, " ").trim();
}

/**
 * Cách đọc bằng kana cho một từ. null = cứ để nguyên.
 * @param {boolean} [choPhepMang] lúc tra một lượt hai chục kết quả thì không,
 *   lúc BẤM LƯU một từ thì có.
 */
async function docKana(word, reading, choPhepMang) {
  const K = window.Kana;
  const w = (word || "").trim();
  if (!w || !hasJapanese(w)) return null;
  if (K.laRomaji(reading)) {
    const k = K.tuRomajiCum(reading);
    return k ? { doc: k, suy: true } : null;     // không đổi được thì giữ romaji còn hơn mất
  }
  if (reading && String(reading).trim()) return null;
  const san = K.docSan(w);
  if (san) return { doc: san, suy: false };
  if (!K.canDoc(w, reading) || !choPhepMang) return null;
  if (kanaDem.has(w)) { const c = kanaDem.get(w); return c ? { doc: c, suy: true } : null; }
  let k = "";
  try { k = K.tuRomajiCum(await romajiCua(w)); } catch (e) { k = ""; }
  kanaDem.set(w, k);
  return k ? { doc: k, suy: true } : null;
}

/** Vá cách đọc cho cả danh sách kết quả tra. Chỉ vài mục đầu mới được gọi mạng. */
async function themDoc(entries, soDuocGoiMang) {
  const ds = entries || [];
  for (let i = 0; i < ds.length; i++) {
    const r = await docKana(ds[i].word, ds[i].reading, i < (soDuocGoiMang || 0));
    if (r) { ds[i].reading = r.doc; if (r.suy) ds[i].docSuy = 1; else delete ds[i].docSuy; }
  }
  return ds;
}

/**
 * Vá furigana cho những mục ĐÃ nằm sẵn trong sổ. Chạy mỗi lần mở sổ tay: phần
 * đổi romaji sang kana làm hết vì không tốn gì, phần phải hỏi mạng thì mỗi lượt
 * chỉ vài chục mục — mở thêm vài lần là hết. KHÔNG đụng `ts`: cách đọc suy ra
 * là như nhau trên mọi máy, để yên mốc thời gian thì cloud khỏi nhận một lượt
 * tải lên "cả sổ vừa đổi".
 */
async function vaFurigana(toiDa) {
  let conMang = Math.max(0, toiDa == null ? 25 : toiDa);
  const nb = await getNB();
  const doi = {};
  for (const k of Object.keys(nb)) {
    const it = nb[k];
    if (!it || it.del) continue;
    if (it.dict !== "javi" && it.dict !== "vija") continue;
    if (it.kind === "sent") continue;
    if (it.reading && !window.Kana.laRomaji(it.reading)) continue;
    const phaiHoi = !it.reading && window.Kana.canDoc(it.word, "");
    if (phaiHoi && conMang <= 0) continue;
    const r = await docKana(it.word, it.reading, phaiHoi);
    if (phaiHoi) conMang--;
    if (r && r.doc && r.doc !== it.reading) doi[k] = r;
  }
  const keys = Object.keys(doi);
  if (!keys.length) return 0;
  await capNhat((moi) => {
    for (const k of keys) {
      const it = moi[k];
      if (!it || it.del) continue;
      it.reading = doi[k].doc;
      if (doi[k].suy) it.docSuy = 1;
    }
  });
  return keys.length;
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
  lastLookupError = T("Chưa tra được (kiểm tra mạng).");
  return [];
}

async function lookup(word, dict) {
  const w = (word || "").trim();
  lastLookupError = "";
  if (!w) return [];
  // Ngăn tiếng Nhật đi đường Mazii; phần dưới là đường tiếng Anh.
  // Vá furigana ngay ở đây, để cái hiện trên màn và cái được lưu là một. Chỉ 4
  // kết quả đầu được gọi mạng: đó là những cái người ta thật sự nhìn.
  if (dict === "javi") return themDoc(await fetchMazii(w), 4);
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
      if (!en) { lastLookupError = T("Chưa dịch được sang tiếng Anh (kiểm tra mạng)."); return []; }
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
    if (!means.length && !dd) { lastLookupError = T("Không tìm thấy từ này"); return []; }
    if (!means.length) {
      const fd = firstDefOf(pos);
      if (fd) means.push("(EN) " + fd);   // dự phòng có nhãn khi chưa lấy được nghĩa Việt
      lastLookupError = T("Chưa lấy được nghĩa tiếng Việt (kiểm tra mạng).");
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
  if (!cfg.url) throw new Error(T2("Chưa cấu hình URL đồng bộ cho tiếng {ngu}", { ngu: T(window.Ngu.ten(ngu)) }));
  const load = await httpPostJson(cfg.url, { token: cfg.token || "", action: "load" }, "text/plain;charset=utf-8");
  if (!load || load.ok === false) throw new Error((load && load.error) || T("Lỗi máy chủ"));
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
  // Ảnh đính kèm KHÔNG đi lên Drive: byte nằm trong IndexedDB của từng máy, nên
  // bản mô tả gửi lên chỉ là con trỏ trỏ vào ổ đĩa máy này — sang máy khác nó
  // là con trỏ chết, hiện ra một ô ảnh trắng không ai giải thích được.
  const guiDi = boAnh(mergedNb);
  // Sổ con cũng tách theo ngôn ngữ, đúng như hồi còn là hai app.
  const nbTatCa = await getNB();
  const mergedDecks = mergeByTs(
    window.Ngu.locSoCon(await getDecks(), nbTatCa, ngu),
    window.Ngu.locSoCon(remoteDecks, remoteNb, ngu));
  // Tiến độ học trộn theo luật riêng — xem TienDo.tron().
  const hocTach = window.Ngu.tachHoc(await Store.get("hoc"));
  const mergedHoc = window.TienDo.tron(hocTach[ngu], remoteHoc);

  const save = await httpPostJson(cfg.url, {
    token: cfg.token || "", action: "save",
    data: { notebook: guiDi, decks: mergedDecks, hoc: mergedHoc }
  }, "text/plain;charset=utf-8");
  if (!save || save.ok === false) throw new Error((save && save.error) || T("Lỗi khi lưu"));

  // Đọc lại NGAY TRƯỚC KHI GHI để không xoá mất thay đổi vừa làm trong lúc chờ
  // mạng — và làm trọn vẹn trong MỘT lượt của hàng đợi, nếu không thì một lượt
  // chấm bài rơi đúng khe giữa lúc đọc và lúc ghi sẽ bị bản cũ đè mất.
  let finalNb;
  await capNhat((nb) => {
    // mergeByTs là phép HỢP: phần của ngôn ngữ kia trong nb đi qua nguyên vẹn.
    // traAnh: bản trên Drive không mang `anh`, để nguyên thì mỗi lượt đồng bộ
    // lại gỡ sạch ảnh của chính máy này.
    finalNb = traAnh(mergeByTs(nb, mergeByTs(remoteNb, mergedNb)), nb);
    for (const k in nb) delete nb[k];
    Object.assign(nb, finalNb);
  });
  const finalDecks = mergeByTs(await getDecks(), mergedDecks);
  const freshHoc = window.Ngu.tachHoc(await Store.get("hoc"));
  const finalHocNgu = window.TienDo.tron(freshHoc[ngu], mergedHoc);
  const finalHoc = Object.assign({}, freshHoc, { [ngu]: finalHocNgu });
  await setDecks(finalDecks); await Store.set("hoc", finalHoc);
  theoDoi.dat(finalHocNgu);
  // So bản ĐÃ BỎ ẢNH với gói vừa gửi: so bản còn ảnh thì lần nào cũng khác nhau
  // và lượt đồng bộ này tự hẹn lượt sau, mãi mãi.
  if (JSON.stringify(boAnh(window.Ngu.locSo(finalNb, ngu))) !== JSON.stringify(guiDi) ||
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
        ? T2(" Chuỗi {n} ngày đang chờ bạn.", { n: view.chuoi.hienTai })
        : "";
      notis.push({
        id: d + 1,
        title: T("Đến giờ ôn từ vựng"),
        body: T2("Hôm nay có {n} mục đến hạn.", { n: n }) + chuoi,
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
  if (name === "detail" && ($("tabDetail").disabled || laNhat())) name = "word";
  if (name === "kanji" && !laNhat()) name = "word";
  ["word", "detail", "kanji", "trans"].forEach((n) => {
    const btn = { word: "tabWord", detail: "tabDetail", kanji: "tabKanji", trans: "tabTrans" }[n];
    const pane = { word: "result", detail: "detail", kanji: "kanji", trans: "trans" }[n];
    $(btn).classList.toggle("active", n === name);
    $(pane).style.display = n === name ? "" : "none";
  });
  if (name === "detail") renderDetail();
  if (name === "trans") showTranslate(($("q").value || "").trim());
}
$("tabWord").addEventListener("click", () => switchSub("word"));
$("tabDetail").addEventListener("click", () => switchSub("detail"));
$("tabKanji").addEventListener("click", () => switchSub("kanji"));
$("tabTrans").addEventListener("click", () => switchSub("trans"));

/* ---- tab Hán tự (chỉ ở chế độ Nhật–Việt) ---- */
/** Chữ này có phải chữ Hán không (gồm cả vùng mở rộng A và vùng tương thích). */
function isCJK(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf) || (c >= 0xf900 && c <= 0xfaff);
}

/**
 * Âm Hán Việt của những chữ Hán trong từ — cái móc trí nhớ mạnh nhất với người
 * Việt học tiếng Nhật: 「職場」 là しょくば thì phải học thuộc, nhưng biết nó
 * là "Chức Trường" thì gần như không cần học.
 */
function hanVietOf(word) {
  const DB = window.KANJI || {};
  const parts = [];
  let has = false;
  for (const ch of (word || "")) {
    if (!isCJK(ch)) continue;
    has = true;
    const d = DB[ch];
    parts.push(d && d.hv ? d.hv.split(/\s*,\s*/)[0].split(/\s+/)[0] : "?");
  }
  if (!has || !parts.length) return "";
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function extractKanji(str) {
  const seen = new Set(), out = [];
  for (const ch of (str || "")) if (isCJK(ch) && !seen.has(ch)) { seen.add(ch); out.push(ch); }
  return out;
}

async function renderKanji(chars) {
  const box = $("kanji");
  if (!chars.length) { trangThai(box, "text-aa", T("Đoạn này không có chữ Hán nào.")); return; }
  box.className = "";
  box.innerHTML = "";
  const list = window.HanTu.LIET_KE(chars.join(""));
  const nb = await getNB();

  for (const k of list) {
    const row = el("div", "kentry");
    row.appendChild(el("div", "kchar", k.ch));

    const body = el("div", "kbody");
    const head = el("div", "khead");
    const key = window.HanTu.KHOA(k.ch);
    const daCo = window.Muc.banCuaBan(nb[key]);

    const left = el("div");
    const hv = el("span", "khv", k.hv || "—");
    left.appendChild(hv);
    if (daCo && daCo.mEdit) left.appendChild(nhanDaSua());
    const meta = window.HanTu.META(k);
    if (meta) left.appendChild(el("div", "kmeta", meta));
    head.appendChild(left);

    const luuChu = async () => {
      const laMoi = await capNhat((so) => {
        const cu = so[key];
        const ne = window.HanTu.MUC(k);
        // Lưu lại một chữ đã có -> giữ nguyên tiến độ học, ghi chú và nghĩa đã sửa.
        if (cu && !cu.del) {
          if (cu.deck) ne.deck = cu.deck;
          if (cu.srs) ne.srs = cu.srs;
          if (cu.fav) ne.fav = cu.fav;
          if (cu.note) ne.note = cu.note;
          if (cu.mEdit) { ne.mEdit = 1; ne.means = cu.means; ne.mOrig = cu.mOrig; }
        }
        // Lưu lại một mục đã xoá: nhặt lại đúng phần bạn tự viết. Xem muc.js.
        window.Muc.nhatLaiBanSua(ne, cu);
        so[key] = ne;
        return !cu || cu.del;
      });
      if (laMoi) mung(await theoDoi.ghiLuu(1));
      syncSoon(); refreshNotifications();
    };
    head.appendChild(hangHanhDong(!!(daCo && daCo.saved), luuChu, key, () => renderKanji(chars)));
    body.appendChild(head);

    const ngh = ((daCo && daCo.mEdit) ? (daCo.means || []) : window.HanTu.MUC(k).means)
      .slice(0, 6).map(meanToStr);
    if (ngh.length) {
      const ul = document.createElement("ul");
      ul.className = "kmean";
      ngh.forEach((m) => ul.appendChild(el("li", null, m)));
      body.appendChild(ul);
    } else {
      body.appendChild(el("div", "kmeta", T("Chưa có nghĩa cho chữ này — bấm Sửa để tự viết vào.")));
    }
    if (daCo && daCo.note) body.appendChild(khoiGhiChu(daCo.note));
    row.appendChild(body);
    box.appendChild(row);
  }
}


async function runLookup(word, src) {
  currentSrc = (src && src.url) ? src : null;   // tra tay/dán -> không nguồn; chia sẻ -> có nguồn
  const w = (word || "").trim();
  if (!w) return;
  $("q").value = w;
  // Mở sẵn tab hợp lý nhất, nhưng cả ba tab đều có dữ liệu — xem ghi chú ở
  // trongNhuCau() về việc thôi đoán ý người dùng.
  // Hán tự luôn có mặt ở chế độ Nhật–Việt, kể cả khi đang xem tab Dịch.
  if (laNhat()) {
    const chars = extractKanji(w);
    renderKanji(chars);
    const lb = $("tabKanji").querySelector(".lb");
    if (lb) lb.textContent = T("Hán tự") + (chars.length ? " " + chars.length : "");
  }
  switchSub(trongNhuCau(w) ? "trans" : "word");

  // Đoạn dài thì tra nguyên đoạn như một từ chắc chắn rỗng — bỏ lượt gọi mạng
  // đó đi, nhưng nói rõ vì sao tab Từ vựng trống.
  if (w.length > 40) {
    lastEntries = [];
    $("tabDetail").disabled = true;
    trangThai($("result"), "article",
      T("Đoạn này dài quá để tra như một từ."), T("Xem tab Dịch, hoặc gõ riêng từ cần tra."));
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
  } catch (e) { toast(T("Không đọc được bộ nhớ tạm. Hãy dán tay vào ô tra."), "bad"); }
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
    b.innerHTML = window.Icon("check", { size: 15 }) + '<span class="lb" data-chu>Đã lưu</span>';
    b.onclick = null;
  };
  if (daLuu) danhDau();
  else {
    b.className = "btn xs tinted";
    b.innerHTML = window.Icon("plus", { size: 15 }) + '<span class="lb" data-chu>Lưu</span>';
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
  b.innerHTML = window.Icon("pencil-simple", { size: 15 }) + '<span class="lb" data-chu>Sửa</span>';
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
  t.innerHTML = window.Icon("pencil-simple", { size: 12 }) + "<span>" + T("bản của bạn") + "</span>";
  return t;
}

async function renderWord(entries) {
  const box = $("result");
  const nb = await getNB();
  const srcSnap = (currentSrc && currentSrc.url) ? currentSrc : null;   // giữ nguồn của lượt tra này

  if (!entries.length) {
    trangThai(box, "warning-circle", T("Không lấy được nghĩa."),
      (lastLookupError ? T2("Chi tiết: {loi}. ", { loi: lastLookupError }) : "")
      + (getNativeHttp() ? "" : T("(Đang chạy chế độ trình duyệt — bản APK gọi mạng kiểu native.)")));
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
    const spk = nutIcon("speaker-high", T("Phát âm"), "", 19);
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
      // Chốt chặn cuối cho furigana: kết quả nằm sâu dưới danh sách chưa được vá
      // lúc tra (để khỏi gọi mạng hai chục lần), nhưng lúc bấm lưu thì chỉ một
      // từ — mà đây đúng là lúc cần cách đọc nhất.
      if (huong === "javi" || huong === "vija") {
        try {
          const rr = await docKana(en.word, en.reading, en.kind !== "sent");
          if (rr) { en.reading = rr.doc; if (rr.suy) en.docSuy = 1; }
        } catch (e) { /* không có furigana thì vẫn lưu */ }
      }
      const laMoi = await capNhat((nb) => {
        const old2 = nb[key];
        const ne2 = { word: en.word, reading: en.reading || "", means: en.means || [], dict: huong, ts: Date.now() };
        if (en.docSuy) ne2.docSuy = 1;               // cách đọc suy ra, không phải từ điển cho
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
          if (old2.ruby && !ne2.ruby) { ne2.ruby = old2.ruby; if (old2.docSuy) ne2.docSuy = 1; }
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
    trangThai(box, "article", T("Không có chi tiết cho từ này."));
    return;
  }
  box.className = "detail";
  box.innerHTML = "";

  if (en.reading) {
    const ipa = el("div", "ipa");
    ipa.appendChild(el("span", null, "IPA:"));
    const b = el("b", null, en.reading);
    ipa.appendChild(b);
    const spk = nutIcon("speaker-high", T("Phát âm"), "", 19);
    spk.addEventListener("click", () => speak(en.word, en.audio));
    ipa.appendChild(spk);
    box.appendChild(ipa);

    // Chú giải cách đọc từng ký hiệu IPA có trong từ này — thứ khiến bảng IPA
    // hữu ích ngay tại chỗ, thay vì bắt người ta mở bảng đầy đủ rồi tự dò.
    const legend = (window.IPA_GUIDE && window.IPA_GUIDE.legendFor(en.reading)) || [];
    if (legend.length) {
      const lg = el("div", "legend");
      const lh = el("div", "lh");
      lh.appendChild(el("span", null, T("Cách đọc các ký hiệu")));
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

/* Hướng dịch của từng lựa chọn trong ô "Hướng". */
const HUONG_DICH = {
  envi: { from: "en", to: "vi" },
  vien: { from: "vi", to: "en" },
  javi: { from: "ja", to: "vi" },
  vija: { from: "vi", to: "ja" },
};

async function translateText(text, dir) {
  const t = (text || "").trim();
  if (!t) throw new Error(T("Chưa có nội dung"));
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
  } else {
    // Hướng dịch phải tra theo BẢNG, không phải "vien thì Việt→Anh, còn lại
    // Anh→Việt". Ở chế độ tiếng Nhật thì hướng duy nhất là "javi", mà nó rơi
    // thẳng vào nhánh còn-lại ấy — thành ra mọi câu tiếng Nhật đều đi xin Google
    // dịch TỪ TIẾNG ANH, và Google trả lại đúng câu cũ. Đó chính là cảnh "tra ở
    // tab Dịch mà ra nguyên mẫu".
    const md = HUONG_DICH[dir];
    if (!md) return { text: "", target: "vi" };     // hướng lạ thì thà không dịch còn hơn dịch sai
    from = md.from; to = md.to;
  }

  const key = from + ">" + to + ":" + t;
  const hit = fresh(key);
  if (hit) return { text: hit.v, target: to };
  let out = "";
  try { out = await gtxTranslate(t, from, to); } catch (e) { out = ""; }
  if (!out) {
    const cfg = await layCfg(NGU);
    if (!cfg.url) throw new Error(T("Không dịch được lúc này (và chưa cấu hình đồng bộ để dùng máy chủ dự phòng)."));
    const r = await httpPostJson(cfg.url, { token: cfg.token || "", action: "translate", text: t, from, to }, "text/plain;charset=utf-8");
    if (!r || r.ok === false || !r.text) throw new Error((r && r.error) || T("Không dịch được"));
    out = r.text;
  }
  put(key, out, to); await Store.set("trCache", cache);
  return { text: out, target: to };
}

async function showTranslate(text) {
  const box = $("trans");
  if (!text) { trangThai(box, "translate", T("Nhập hoặc dán đoạn cần dịch.")); return; }
  const srcSnap = (currentSrc && currentSrc.url) ? { url: currentSrc.url, title: currentSrc.title, sel: text } : null;
  trangThai(box, "spinner-gap", T("Đang dịch…"));
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
    const spk = nutIcon("speaker-high", T("Nghe câu tiếng Anh"), "", 19);
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
          if (oldS.ruby && !neS.ruby) { neS.ruby = oldS.ruby; if (oldS.docSuy) neS.docSuy = 1; }
          if (oldS.mEdit) { neS.mEdit = 1; neS.means = oldS.means; neS.mOrig = oldS.mOrig; }
        }
        // Lưu lại một mục đã xoá: nhặt lại đúng phần bạn tự viết. Xem muc.js.
        window.Muc.nhatLaiBanSua(neS, oldS);
        nb[key] = neS;
        return !oldS || oldS.del;
      });
      if (laMoi) mung(await theoDoi.ghiLuu(1));
      syncSoon(); refreshNotifications();
      toast(T("Đã lưu — bấm Sửa nếu bản dịch chưa đúng chuyên ngành"));
    };
    phai.appendChild(hangHanhDong(!!(daCo && daCo.saved), luuCau, key, () => showTranslate(text)));
    hd.appendChild(phai);
    box.appendChild(hd);
    if (daCo && daCo.note) box.appendChild(khoiGhiChu(daCo.note));
    box.appendChild(el("div", "src", text));
  } catch (e) {
    trangThai(box, "warning-circle", (e && e.message) || T("Không dịch được."));
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
/* ==================================================================== */
/* Ảnh đính kèm                                                         */
/* ==================================================================== */
/*
 * Byte ảnh nằm trong IndexedDB của máy này (xem anh.js); mục sổ tay chỉ mang
 * bản mô tả nhẹ trong `anh`. Giống hệt bản extension — hai bên dùng chung một
 * sổ, nên phải cùng một luật.
 */

/** Danh sách ảnh đang sửa trong bảng Sửa. Chốt lại vào mục khi bấm Lưu. */
let anhSua = [];

/** Một ô ảnh: bấm vào là mở to, bấm dấu × là gỡ. */
function oAnh(f, choGo) {
  const o = el("button", "anh-o");
  o.type = "button";
  o.title = f.ten + " · " + window.Anh.coChu(f.cd);
  const img = document.createElement("img");
  img.alt = f.ten;
  o.appendChild(img);
  window.Anh.url(f.id).then((u) => { if (u) img.src = u; });
  o.addEventListener("click", () => {
    window.Anh.url(f.id).then((u) => { if (u) window.open(u, "_blank", "noopener"); });
  });
  if (choGo) {
    const x = el("button", "anh-xoa");
    x.type = "button"; x.textContent = "✕"; x.title = T("Gỡ ảnh này");
    x.addEventListener("click", (e) => {
      e.stopPropagation();
      anhSua = anhSua.filter((a) => a.id !== f.id);
      veAnhSua();
    });
    o.appendChild(x);
  }
  return o;
}

function veAnhSua() {
  const hang = $("edAnh");
  hang.innerHTML = "";
  anhSua.forEach((f) => hang.appendChild(oAnh(f, true)));
}

async function themAnh(ds) {
  const loi = $("edAnhLoi");
  loi.textContent = "";
  for (const f of Array.from(ds || [])) {
    if (!window.Anh.laAnh(f.type)) { loi.textContent = T("Chỉ nhận ảnh."); continue; }
    try { anhSua.push(await window.Anh.luu(f)); }
    catch (e) { loi.textContent = (e && e.message) || T("Không lưu được ảnh."); }
  }
  veAnhSua();
}

$("edAnhFile").addEventListener("change", (e) => {
  themAnh(e.target.files).then(() => { e.target.value = ""; });
});
$("edNote").addEventListener("paste", (e) => {
  const tep = e.clipboardData && e.clipboardData.files;
  if (!tep || !tep.length) return;
  e.preventDefault();
  themAnh(tep);
});

function moSua(it, tab, veLai) {
  dangSua = { key: it.key, veLai: veLai || null };
  anhSua = (it.anh || []).slice();
  veAnhSua();
  $("edAnhLoi").textContent = "";
  const laGhiChu = tab === "note";
  $("edTitle").textContent = laGhiChu ? T("Ghi chú cho mục này") : T("Sửa bản dịch");
  $("edIcon").innerHTML = window.Icon(laGhiChu ? "note-pencil" : "translate", { size: 20 });
  $("edSub").textContent = laGhiChu
    ? T("Ghi lại ngữ cảnh, thuật ngữ tương đương, cách dùng — thứ mà từ điển không nói.")
    : T("Chỉnh lại cho đúng cách nói của chuyên ngành bạn. Mỗi dòng là một nghĩa.");
  $("edOrig").textContent = it.word || "";
  $("edTrans").value = (it.means || []).join("\n");
  $("edNote").value = it.note || "";
  const goc = it.mOrig && it.mOrig.length ? it.mOrig.join("; ") : "";
  $("edOrigHint").textContent = goc ? T2("Bản máy dịch ban đầu: {ban}", { ban: goc }) : "";
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
    if (anhSua.length) ne.anh = anhSua.slice(); else delete ne.anh;
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
  toast(doiNghia ? T("Đã lưu bản dịch của bạn") : T("Đã lưu ghi chú"));
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
const HANTU = "__kanji__";   // sổ con ảo: chỉ những mục là MỘT chữ Hán
let curDeck = ALL;

function dirLabel(d) {
  if (d === "kanji") return T("Hán tự");
  if (d === "javi") return T("Nhật→Việt");
  if (d === "vija") return T("Việt→Nhật");
  if (d === "vien") return T("Việt→Anh");
  if (d === "envi") return T("Anh→Việt");
  // Mục cũ không ghi hướng thì đoán theo ngăn đang mở — danh sách đằng nào cũng
  // đã lọc theo đúng một ngôn ngữ rồi.
  return laNhat() ? T("Nhật→Việt") : T("Anh→Việt");
}
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
    b.title = on ? T2("Bỏ khỏi {ten}", { ten: ten }) : ten;
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
  wrap.appendChild(mk(1, "heart", "like", T("Thích")));
  wrap.appendChild(mk(-1, "thumbs-down", "dislike", T("Không thích")));
  return wrap;
}

/** Khối ghi chú riêng, hiện dưới phần nghĩa. */
function khoiGhiChu(chu) {
  const box = el("div", "mynote");
  const h = el("div", "nh");
  h.appendChild(ic("note-pencil", { size: 13 }));
  h.appendChild(el("span", null, T("Ghi chú của bạn")));
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
      // Đóng dấu mốc cho tiến độ ôn của các mục cũ — xem ghi chú cùng chỗ này
      // bên bản extension. KHÔNG đụng vào `e.ts`.
      if (e && e.srs && typeof e.srs.lv === "number" && typeof e.srs.ts !== "number") {
        e.srs = Object.assign({}, e.srs, { ts: e.ts || 0 });
        daSuaCu = true;
      }
    }
  });
  if (daSuaCu) syncSoon();
  // Thu lại URL của lượt vẽ trước rồi bỏ những blob không mục nào còn trỏ tới.
  if (window.Anh) {
    window.Anh.nhaUrl();
    getNB().then((t) => window.Anh.quet(t)).catch(() => {});
  }
  // Vá furigana cho những mục cũ còn thiếu cách đọc. Chạy nền, xong tới đâu vẽ
  // lại tới đó — mở sổ không phải chờ mạng.
  if (laNhat() && !dangVaFurigana) {
    dangVaFurigana = true;
    vaFurigana(25).then((n) => { dangVaFurigana = false; if (n) drawNotebook(); },
                        () => { dangVaFurigana = false; });
  }
  // Chỉ phần của ngôn ngữ đang bật; dữ liệu bên kia vẫn nằm nguyên trong kho.
  const nb = await getNBNgu();
  // Sổ cũ chưa có nhãn ngôn ngữ thì suy từ mục đang dùng nó rồi ghi lại một lần.
  const nbTatCa = await getNB();
  const gan = window.Ngu.ganNguChoSo(await getDecks(), nbTatCa);
  if (gan.doi) { await setDecks(gan.decks); syncSoon(); }
  const decks = window.Ngu.locSoCon(gan.decks, nbTatCa, NGU);

  const items = Object.entries(nb).map(([key, v]) => ({ key, ...v })).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const activeItems = items.filter((it) => !it.del);
  if (curDeck !== ALL && curDeck !== NONE && curDeck !== LIKE && curDeck !== DISLIKE && curDeck !== HANTU && !deckName(decks, curDeck)) curDeck = ALL;

  /* --- hàng chip sổ con --- */
  const bar = $("deckBar");
  bar.innerHTML = "";
  const activeDecks = Object.values(decks).filter((d) => !d.del).sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const countIn = (id) => id === ALL ? activeItems.length
    : id === NONE ? activeItems.filter((i) => !i.deck).length
    : id === LIKE ? activeItems.filter((i) => i.fav === 1).length
    : id === DISLIKE ? activeItems.filter((i) => i.fav === -1).length
    : id === HANTU ? activeItems.filter((i) => i.dict === "kanji").length
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
  mk(ALL, T("Tất cả"), "list-bullets");
  mk(NONE, T("Chưa phân loại"), "funnel");
  mk(LIKE, T("Thích"), "heart");
  mk(DISLIKE, T("Không thích"), "thumbs-down");
  // Học chữ và học từ là hai buổi khác nhau, nên Hán tự có ngăn riêng. Bên
  // tiếng Anh không có ngăn này.
  if (laNhat()) mk(HANTU, T("Hán tự"), "text-aa");
  activeDecks.forEach((d) => mk(d.id, d.name, "folder-simple"));

  const add = el("button", "chip add");
  add.type = "button";
  add.appendChild(ic("folder-plus", { size: 15 }));
  add.appendChild(el("span", null, T("Sổ mới")));
  add.addEventListener("click", async () => {
    const name = (prompt(T("Tên sổ con mới:")) || "").trim();
    if (!name) return;
    const d = await getDecks();
    const id = "d_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    d[id] = { id, name, ngu: NGU, ts: Date.now() };
    await setDecks(d); curDeck = id; drawNotebook(); syncSoon();
  });
  bar.appendChild(add);
  $("deckActions").style.display =
    (curDeck !== ALL && curDeck !== NONE && curDeck !== LIKE && curDeck !== DISLIKE && curDeck !== HANTU) ? "" : "none";

  /* --- danh sách --- */
  const kw = $("filter").value.trim().toLowerCase();
  let rows = activeItems;
  if (curDeck === NONE) rows = rows.filter((i) => !i.deck);
  else if (curDeck === LIKE) rows = rows.filter((i) => i.fav === 1);
  else if (curDeck === DISLIKE) rows = rows.filter((i) => i.fav === -1);
  else if (curDeck === HANTU) rows = rows.filter((i) => i.dict === "kanji");
  else if (curDeck !== ALL) rows = rows.filter((i) => i.deck === curDeck);
  if (kw) {
    rows = rows.filter((it) =>
      // Có cả furigana của câu: gõ かな tìm được câu, dù trong câu chỉ có chữ Hán.
      (it.word + " " + (it.reading || "") + " " + ((it.ruby || []).join(" ")) + " "
        + (it.means || []).join(" ") + " " + (it.note || ""))
        .toLowerCase().includes(kw));
  }
  $("nbCount").textContent = T2("Đang hiện {n} mục", { n: rows.length })
    + (rows.length !== activeItems.length ? " trong " + activeItems.length : "");

  const list = $("nbList");
  list.innerHTML = "";
  if (!rows.length) {
    const d = el("div", "empty");
    d.appendChild(ic("notebook", { size: 38 }));
    d.appendChild(el("div", null, activeItems.length
      ? T("Không có mục nào ở đây.")
      : T("Chưa có mục nào. Sang tab Tra từ và bấm Lưu.")));
    list.appendChild(d);
    return;
  }

  const now = Date.now();
  for (const it of rows) {
    const row = el("div", "entry" + (it.kind === "sent" ? " sent" : "") + (it.dict === "kanji" ? " kanji" : ""));
    const body = el("div", "body");

    const head = el("div", "head");
    // Cả câu thì furigana nằm TRÊN từng khúc chữ Hán (ruby), không phải một dòng
    // kana chạy dài ở bên cạnh — dòng đó đọc còn mệt hơn đọc chữ Hán.
    const wSpan = el("span", "w" + (laNhat() ? " ja" : ""));
    const rb = (it.ruby && it.ruby.length && window.Kana) ? window.Kana.htmlRuby(it.word, it.ruby) : "";
    if (rb) { wSpan.innerHTML = rb; wSpan.classList.add("co-ruby"); }
    else wSpan.textContent = it.word;
    if (rb && it.docSuy) wSpan.title = T("Cách đọc suy ra từ phiên âm, có thể chưa chuẩn");
    head.appendChild(wSpan);
    if (it.reading) {
      const r = el("span", "r", it.reading);
      // Cách đọc suy từ phiên âm La-tinh có thể trật (ō là おう hay おお?), nên
      // nói thẳng ra thay vì để người học tin nhầm là từ điển bảo thế.
      if (it.docSuy) { r.classList.add("suy"); r.title = T("Cách đọc suy ra từ phiên âm, có thể chưa chuẩn"); }
      head.appendChild(r);
    }
    const spk = nutIcon("speaker-high", T("Phát âm"), "", 18);
    spk.addEventListener("click", () => speak(it.word, it.audio));
    head.appendChild(spk);
    head.appendChild(favButtons(it));
    head.appendChild(el("span", "tag", dirLabel(it.dict)));
    if (it.mEdit) {
      const t = el("span", "tag edited");
      t.appendChild(ic("pencil-simple", { size: 12 }));
      t.appendChild(el("span", null, T("đã sửa")));
      head.appendChild(t);
    }
    // Cấp và hạn ôn đi cùng một chỗ — xem ghi chú cùng chỗ này bên bản extension.
    {
      const den = isDue(it, now);
      const t = el("span", "tag srs" + (den ? " due" : ""));
      t.appendChild(ic(den ? "alarm" : "target", { size: 12 }));
      t.appendChild(el("span", null, chuCap(it, now)));
      head.appendChild(t);
    }
    body.appendChild(head);

    const hvS = hanVietOf(it.word);
    if (hvS) body.appendChild(el("div", "hv", T2("Hán Việt: {am}", { am: hvS })));
    if (it.dict === "kanji") {
      const km = window.HanTu.META(it.kanji);
      if (km) body.appendChild(el("div", "t-tiny faint", km));
    }
    if (it.means && it.means.length) body.appendChild(el("div", "m", it.means.slice(0, 4).join("; ")));
    if (it.note && it.note.trim()) body.appendChild(khoiGhiChu(it.note.trim()));
    if (it.anh && it.anh.length) {
      const hangAnh = el("div", "anh-hang");
      it.anh.forEach((f) => hangAnh.appendChild(oAnh(f, false)));
      body.appendChild(hangAnh);
    }

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
    o0.value = NONE; o0.textContent = T("Chưa phân loại");
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

    const sua = nutIcon("translate", T("Sửa bản dịch cho đúng chuyên ngành"), "", 18);
    sua.addEventListener("click", () => moSua(it, "trans"));
    ctl.appendChild(sua);

    const gc = nutIcon("note-pencil", it.note ? T("Sửa ghi chú") : T("Thêm ghi chú"), it.note ? "on" : "", 18);
    gc.addEventListener("click", () => moSua(it, "note"));
    ctl.appendChild(gc);

    const lk = nutIcon("link-simple", it.src && it.src.url ? T("Mở lại trang nguồn") : T("Thêm link nguồn"),
      it.src && it.src.url ? "on" : "", 18);
    lk.addEventListener("click", () => { if (it.src && it.src.url) openSourceExt(it); else addLink(it); });
    // Giữ lâu trên nút link để sửa/xoá link — đỡ phải thêm một nút nữa vào hàng
    // vốn đã chật trên màn hình điện thoại.
    let giu = null;
    lk.addEventListener("touchstart", () => { giu = setTimeout(() => addLink(it), 550); }, { passive: true });
    ["touchend", "touchcancel", "touchmove"].forEach((ev) =>
      lk.addEventListener(ev, () => clearTimeout(giu), { passive: true }));
    ctl.appendChild(lk);

    const del = nutIcon("trash", T("Xoá khỏi sổ tay"), "danger", 18);
    del.addEventListener("click", async () => {
      if (!confirm(T2("Xoá “{tu}”?", { tu: it.word.slice(0, 40) }))) return;
      await capNhat((nb) => {
        nb[it.key] = window.Muc.biaMo(it);
      });
      drawNotebook(); syncSoon(); refreshNotifications();
      toast(T("Đã xoá khỏi sổ tay"));
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
  const name = (prompt(T("Đổi tên sổ:"), cur) || "").trim(); if (!name || name === cur) return;
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
  $("syncStatus").textContent = T("Đã lưu cấu hình.");
});
$("syncNow").addEventListener("click", async () => {
  $("syncStatus").textContent = T("Đang đồng bộ…");
  try {
    const n = await syncNow();
    $("syncStatus").textContent = T2("Đã đồng bộ · {n} mục · {gio}", { n: n, gio: new Date().toLocaleTimeString() });
    drawNotebook(); veChuoiNgay(); refreshNotifications();
  } catch (e) {
    $("syncStatus").textContent = T2("Lỗi: {loi}", { loi: (e && e.message) || e });
  }
});

/* --- nhắc học --- */
$("notifOn").addEventListener("click", async () => {
  await Store.set("notifCfg", { on: true, time: $("notifTime").value || "20:00" });
  await refreshNotifications();
  $("notifStatus").textContent = T2("Đã bật nhắc lúc {gio} hằng ngày.", { gio: $("notifTime").value || "20:00" });
});
$("notifOff").addEventListener("click", async () => {
  await Store.set("notifCfg", { on: false });
  if (Plugins.LocalNotifications) {
    try { await Plugins.LocalNotifications.cancel({ notifications: [1, 2, 3, 4, 5, 6, 7].map((id) => ({ id })) }); } catch (e) {}
  }
  $("notifStatus").textContent = T("Đã tắt nhắc nhở.");
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
      const spk = nutIcon("speaker-high", T("Nghe ví dụ"), "", 18);
      spk.addEventListener("click", () => speak(it.ex));
      row.appendChild(spk);
      box.appendChild(row);
    });
  };
  sec(T("Nguyên âm"), G.VOWELS);
  sec(T("Nguyên âm đôi"), G.DIPH);
  sec(T("Phụ âm"), G.CONS);
  sec(T("Dấu nhấn & độ dài"), G.MARKS);
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
  $("stIdleTitle").textContent = due.length ? T2("Có {n} mục đến hạn", { n: due.length }) : T("Không còn mục nào đến hạn");
  $("stIdleSub").textContent = view.homNay.dat
    ? T2("Hôm nay đã đạt mục tiêu {dich} lượt. Chuỗi {n} ngày.", { dich: view.goal, n: Math.max(1, view.chuoi.hienTai) })
    : T2("Ôn thêm {n} lượt nữa là đạt mục tiêu hôm nay.", { n: view.homNay.conLai });
  $("stStart").disabled = due.length === 0;
}

$("stStart").addEventListener("click", async () => {
  const due = await currentDue();
  if (!due.length) { toast(T("Không có mục nào đến hạn. Quay lại sau nhé!"), "bad"); return; }
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
  box.appendChild(mk(1, "heart", T("Thích")));
  box.appendChild(mk(-1, "thumbs-down", T("Không thích")));
}

/** @param {boolean} giuLat  true = vẽ lại thẻ nhưng giữ nguyên trạng thái đã lật */
function showCard(giuLat) {
  const it = session.queue[0];
  if (!it) { finishStudy(); return; }
  const daLat = giuLat && $("stGrade").style.display !== "none";

  $("stProg").textContent = T2("Còn {n} mục · đã xong {xong}", { n: session.queue.length, xong: session.done });
  $("stCard").className = "studycard" + (it.kind === "sent" ? " sent" : "") + (it.dict === "kanji" ? " kanji" : "");
  $("stWord").textContent = it.word;
  $("stWord").className = "cw" + (laNhat() ? " ja" : "");
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
  const hvS = hanVietOf(it.word);
  $("stRead").textContent = (it.reading || "") + (hvS ? ((it.reading ? "\u3000·\u3000" : "") + T2("Hán Việt: {am}", { am: hvS })) : "");
  // Lật thẻ một CÂU: cách đọc của nó là ruby trên chính câu ở mặt trước.
  const rbS = (it.ruby && it.ruby.length && window.Kana) ? window.Kana.htmlRuby(it.word, it.ruby) : "";
  const oW = $("stWord");
  if (rbS) { oW.innerHTML = rbS; oW.classList.add("co-ruby"); }
  $("stMean").innerHTML = "";
  if (it.dict === "kanji") {
    const km = window.HanTu.META(it.kanji);
    if (km) $("stMean").appendChild(el("div", "t-small faint", km));
  }
  if (it.means && it.means.length) {
    const ul = document.createElement("ul");
    it.means.slice(0, 5).forEach((m) => ul.appendChild(el("li", null, m)));
    $("stMean").appendChild(ul);
  }
  // Ghi chú riêng chỉ hiện SAU khi lật thẻ — nó thường chứa luôn đáp án.
  $("stMyNote").innerHTML = "";
  if (it.note && it.note.trim()) $("stMyNote").appendChild(khoiGhiChu(it.note.trim()));
  if (it.anh && it.anh.length) {
    const hangAnh = el("div", "anh-hang");
    it.anh.forEach((f) => hangAnh.appendChild(oAnh(f, false)));
    $("stMyNote").appendChild(hangAnh);
  }
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
  $("stIdleTitle").textContent = T("Xong buổi học!");
  const phan = [T2("Đã thuộc {n} mục", { n: session.done })];
  if (session.again) phan.push(T2("học lại {n} lượt", { n: session.again }));
  if (session.deleted) phan.push(T2("đã xoá {n} mục", { n: session.deleted }));
  phan.push(view.homNay.dat
    ? T2("Hôm nay đạt mục tiêu — chuỗi {n} ngày.", { n: Math.max(1, view.chuoi.hienTai) })
    : T2("Còn {n} lượt nữa là đạt mục tiêu hôm nay.", { n: view.homNay.conLai }));
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
  if (!cfg.url) { toast(T("Chưa cấu hình đồng bộ Google Drive"), "bad"); return; }
  await pullAndRefresh();
  toast(T("Đã làm mới"));
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
    if (!src) setTimeout(() => toast(T("Trình duyệt không gửi kèm link. Giữ lâu nút link trong Sổ tay để dán tay."), "bad"), 400);
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
  $("icChu").innerHTML = window.Icon("translate", { size: 18 });
  $("icSync").innerHTML = window.Icon("cloud-arrow-up", { size: 18 });
  $("icBell").innerHTML = window.Icon("bell-ringing", { size: 18 });
  $("icIpa").innerHTML = window.Icon("text-aa", { size: 18 });
  ["cr0", "cr1", "cr2", "cr3"].forEach((id) => { $(id).innerHTML = window.Icon("caret-right", { size: 16 }); });
  $("q").parentElement.insertBefore(ic("magnifying-glass", { size: 18 }), $("q"));
  $("filter").parentElement.insertBefore(ic("magnifying-glass", { size: 18 }), $("filter"));
  $("stSpk").innerHTML = window.Icon("speaker-high", { size: 22 });

  const gan = (id, ten, chu, size) => {
    $(id).innerHTML = window.Icon(ten, { size: size || 16 }) + '<span class="lb" data-chu>' + chu + "</span>";
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
  st.innerHTML = window.Icon("graduation-cap", { size: 20 }) + '<span class="lb" data-chu>Bắt đầu học</span>';
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
  en: [["auto", T("Tự động")], ["envi", T("Anh→Việt")], ["vien", T("Việt→Anh")]],
  ja: [["javi", T("Nhật→Việt")]]
};

function veNgu() {
  // Tab "Chi tiết" là IPA/định nghĩa Anh; "Hán tự" chỉ có nghĩa với tiếng Nhật.
  $("tabDetail").style.display = laNhat() ? "none" : "";
  $("tabKanji").style.display = laNhat() ? "" : "none";
  $("ipaGuideBtn") && ($("ipaGuideBtn").style.display = laNhat() ? "none" : "");
  const b = $("nguBtn");
  b.textContent = laNhat() ? "日→V" : "EN→V";
  b.title = T2("Đang tra {huong} — chạm để đổi", { huong: laNhat() ? T("Nhật–Việt") : T("Anh–Việt") });
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
  toast(T2("Đã chuyển sang {huong}", { huong: laNhat() ? T("Nhật–Việt") : T("Anh–Việt") }));
});

/** Xoá huy hiệu của ngôn ngữ chưa hề có hoạt động nào — xem Ngu.donHuyHieuLac. */
async function donHuyHieu() {
  const kq = window.Ngu.donHuyHieuLac(await Store.get("hoc"), await getNB());
  if (!kq.doi.length) return;
  await Store.set("hoc", kq.hoc);
}

(async () => {
  gaiIcon();
  await napChu();      // sau gaiIcon: nhãn do nó dựng ra mới có mặt để dịch
  await napNgu();
  veNgu();
  await donHuyHieu();
  await theoDoi.nap();
  await veChuoiNgay();
  const oChu = $("chuNgu");
  if (oChu) oChu.addEventListener("change", () => doiChu(oChu.value));

  const cfg = await layCfg(NGU);
  if (cfg.url) {
    $("syncUrl").value = cfg.url;
    $("syncToken").value = cfg.token || "";
    syncNow(NGU).then((n) => {
      $("syncStatus").textContent = T2("Đã đồng bộ · {n} mục", { n: n });
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
