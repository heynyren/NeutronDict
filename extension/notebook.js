/**
 * Trang Sổ tay NeutronDict.
 *
 * Hai màn dùng chung một cột điều khiển bên trái:
 *   · Sổ tay  — danh sách mục đã lưu, sửa bản dịch, ghi chú, phân sổ con
 *   · Tiến độ — mục tiêu ngày, chuỗi ngày, lịch nhiệt, huy hiệu (xem tien-do.js)
 *
 * Giao diện dựng bằng hệ thiết kế trong ui.css và bộ icon Phosphor trong
 * icons.js. Không còn emoji ở bất cứ đâu: emoji do phông chữ của máy vẽ nên mỗi
 * hệ điều hành ra một kiểu, không chỉnh được nét cũng không chỉnh được màu.
 */
"use strict";

/* ==================================================================== */
/* Tiện ích chung                                                       */
/* ==================================================================== */

const $ = (id) => document.getElementById(id);

/** Tạo phần tử: el("div", "card", "chữ"). */
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

let toastTimer = null;
function toast(chu, kieu) {
  const t = $("toast");
  t.className = "toast" + (kieu ? " " + kieu : "");
  t.textContent = "";
  t.appendChild(ic(kieu === "bad" ? "warning-circle" : "check-circle", { size: 18, weight: "solid" }));
  t.appendChild(el("span", null, chu));
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

function fmtDate(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch (e) { return ""; }
}
function dirLabel(d) {
  if (d === "kanji") return "Hán tự";
  if (d === "javi") return "Nhật→Việt";
  if (d === "vija") return "Việt→Nhật";
  if (d === "vien") return "Việt→Anh";
  if (d === "envi") return "Anh→Việt";
  // Mục cũ không ghi hướng thì đoán theo ngăn đang mở — đằng nào danh sách cũng
  // đã lọc theo đúng một ngôn ngữ rồi.
  return NGU === "ja" ? "Nhật→Việt" : "Anh→Việt";
}

/* ==================================================================== */
/* Lưu trữ                                                              */
/* ==================================================================== */

const ALL = "__all__", NONE = "__none__";
const LIKE = "__like__", DISLIKE = "__dislike__";
const HANTU = "__kanji__";   // sổ con ảo: chỉ những mục là MỘT chữ Hán

let items = [];   // mục trong sổ (gồm cả bia mộ đã xoá)
let decks = {};
let current = ALL;

/**
 * Ngôn ngữ đang bật. Đổi nó là đổi cả sổ tay, chỗ lưu lẫn cloud đang dùng —
 * nhưng KHÔNG đụng một byte nào của ngôn ngữ kia: hai bên nằm chung một kho,
 * phân biệt bằng tiền tố khoá, nên chuyển qua chuyển lại bao nhiêu lần cũng
 * không mất gì.
 */
let NGU = "en";

/** Ngôn ngữ mà bản tiến độ đang giữ trong bộ nhớ thuộc về. */
let nguDaNap = "";

async function getStore() {
  const s = await chrome.storage.local.get(["notebook", "decks"]);
  return { nb: s.notebook || {}, decks: s.decks || {} };
}
async function setNotebook(nb) { await chrome.storage.local.set({ notebook: nb }); }
async function setDecks(d) { await chrome.storage.local.set({ decks: d }); }

function active(list) { return list.filter((it) => !it.del); }
function activeDecks() {
  return Object.values(decks).filter((d) => !d.del).sort((a, b) => (a.ts || 0) - (b.ts || 0));
}
function deckName(id) { const d = decks[id]; return d && !d.del ? d.name : null; }

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
function suaSoTay(fn) {
  // .then(fn, fn) để một lượt ghi hỏng không làm kẹt mọi lượt ghi sau nó.
  const chay = hangDoiGhi.then(fn, fn);
  hangDoiGhi = chay.then(() => {}, () => {});
  return chay;
}

/** Đọc sổ tay, đưa cho fn sửa, rồi ghi lại — trọn vẹn trong một lượt. */
function capNhat(fn) {
  return suaSoTay(async () => {
    const s = await getStore();
    const kq = await fn(s.nb, s.decks);
    await chrome.storage.local.set({ notebook: s.nb, decks: s.decks });
    return kq;
  });
}

/* ==================================================================== */
/* Sóng học tập (lặp lại ngắt quãng)                                    */
/* ==================================================================== */

const SRS_STEPS = [1, 3, 7, 14, 30, 60, 120];
const DAY = 24 * 60 * 60 * 1000;
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
  const srs = it.srs;
  if (!srs || !srs.due) return true;        // mục mới: đến hạn ngay
  return srs.due <= now;
}
function dueList(scopeList) {
  const now = Date.now();
  return scopeList.filter((it) => isDue(it, now));
}
async function gradeWord(key, remembered) {
  await capNhat((nb) => {
    const e = nb[key];
    if (!e) return;
    const now = Date.now();
    const cur = (e.srs && typeof e.srs.lv === "number") ? e.srs.lv : -1;
    let lv, due;
    if (remembered) {
      lv = Math.min(cur + 1, SRS_STEPS.length - 1);
      due = dueInDays(SRS_STEPS[lv]);
    } else {
      lv = -1;                 // rơi về đầu
      due = now;               // học lại ngay trong buổi
    }
    nb[key] = Object.assign({}, e, { srs: { lv: lv, due: due }, ts: now });
  });
}

/* ==================================================================== */
/* Theo dõi tiến độ & huy hiệu                                          */
/* ==================================================================== */

/**
 * Số liệu lấy từ sổ tay để xét huy hiệu.
 * Tính từ mảng `items` đang có trong bộ nhớ nên không tốn thêm lượt đọc đĩa.
 */
function soLieuSoTay() {
  const a = active(items);
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
  const dungSo = new Set(a.map((it) => it.deck).filter((d) => d && deckName(d)));
  return { tong: a.length, nhoLau, daSua, coGhiChu, thich, denHan, trongChuKy, soCon: dungSo.size };
}

/*
 * Tiến độ học tách theo ngôn ngữ: { ja: {...}, en: {...} }.
 *
 * Đọc/ghi đều chỉ chạm vào ngăn của ngôn ngữ đang bật, nên học tiếng Anh không
 * bao giờ làm xê dịch chuỗi ngày của tiếng Nhật. Bản cũ chỉ có một object
 * phẳng — Ngu.tachHoc chuyển nó nguyên vẹn vào ngăn "en", không mất lượt nào.
 */
const theoDoi = window.TienDo.tao({
  // Ghi theo nguDaNap — ngôn ngữ mà bản đang giữ trong bộ nhớ thuộc về — chứ
  // KHÔNG theo NGU. Ghi theo NGU thì chỉ cần một lượt ghi rơi vào lúc vừa đổi
  // ngôn ngữ mà bản cũ chưa kịp nạp lại, là tiến độ và huy hiệu của bên này
  // chui sang ngăn bên kia. Đó đúng là lỗi "sang tiếng Anh cũng thấy 3 huy
  // hiệu của tiếng Nhật".
  doc: async () => {
    nguDaNap = NGU;
    return window.Ngu.tachHoc((await chrome.storage.local.get("hoc")).hoc)[NGU];
  },
  ghi: async (d) => {
    const cu = window.Ngu.tachHoc((await chrome.storage.local.get("hoc")).hoc);
    await chrome.storage.local.set({ hoc: Object.assign({}, cu, { [nguDaNap || NGU]: d }) });
  },
  soLieu: async () => soLieuSoTay(),
  sauKhiGhi: () => syncSoon()
});

/** Hiện chúc mừng nếu vừa mở khoá huy hiệu, rồi vẽ lại màn tiến độ. */
function mung(ids) {
  if (!ids || !ids.length) return;
  window.TienDo.anMung(ids, () => {
    if ($("viewProgress").classList.contains("show")) veTienDo();
  });
}

async function veTienDo() {
  await window.TienDo.veBang($("progressBody"), theoDoi);
}

/* ==================================================================== */
/* Tải dữ liệu                                                          */
/* ==================================================================== */

async function load() {
  // Khôi phục các mục cũ bị lưu nghĩa dạng object ("[object Object]") -> chuỗi.
  // Đi qua hàng đợi vì đây cũng là một lượt ghi, và load() hay chạy ngay sau
  // một lượt chấm bài.
  let daSuaCu = false;
  await capNhat((nb) => {
    for (const k in nb) {
      const e = nb[k];
      if (e && Array.isArray(e.means)) {
        const nm = e.means.map(meanToStr);
        if (nm.some((v, i) => v !== e.means[i])) { e.means = nm; daSuaCu = true; }
      }
    }
  });
  if (daSuaCu) syncSoon();
  const s = await getStore();
  // Sổ cũ chưa có nhãn ngôn ngữ thì suy từ mục đang dùng nó, rồi ghi lại một
  // lần cho xong — lần sau khỏi phải suy nữa.
  const gan = window.Ngu.ganNguChoSo(s.decks, s.nb);
  if (gan.doi) { await chrome.storage.local.set({ decks: gan.decks }); syncSoon(); }
  decks = window.Ngu.locSoCon(gan.decks, s.nb, NGU);
  // Chỉ lấy phần của ngôn ngữ đang bật. Hai thứ tiếng nằm chung một kho nhưng
  // khoá đã mang tiền tố sẵn ("javi:", "kanji:", "envi:"), nên lọc là đủ — dữ
  // liệu bên kia vẫn nằm nguyên đó, không hề bị đụng tới.
  items = Object.entries(window.Ngu.locSo(s.nb, NGU)).map(([key, v]) => ({ key, ...v }));
  items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  // Sổ đang chọn đã bị xoá -> quay về Tất cả.
  if (current !== ALL && current !== NONE && current !== LIKE && current !== DISLIKE && current !== HANTU && !deckName(current)) current = ALL;
  drawDecks();
  draw();
}

/* ==================================================================== */
/* Cột trái: sổ con                                                     */
/* ==================================================================== */

function countIn(id) {
  const a = active(items);
  if (id === ALL) return a.length;
  if (id === NONE) return a.filter((it) => !it.deck).length;
  if (id === LIKE) return a.filter((it) => it.fav === 1).length;
  if (id === DISLIKE) return a.filter((it) => it.fav === -1).length;
  if (id === HANTU) return a.filter((it) => it.dict === "kanji").length;
  return a.filter((it) => it.deck === id).length;
}

function drawDecks() {
  const bar = $("deckBar");
  bar.innerHTML = "";
  const mk = (id, label, iconTen) => {
    const b = el("button", "chip" + (current === id ? " active" : ""));
    b.type = "button";
    b.appendChild(ic(iconTen, { size: 16, weight: current === id ? "solid" : "line" }));
    b.appendChild(el("span", "grow", label));
    b.appendChild(el("span", "n", String(countIn(id))));
    b.addEventListener("click", () => { current = id; drawDecks(); draw(); });
    bar.appendChild(b);
  };
  mk(ALL, "Tất cả", "list-bullets");
  mk(NONE, "Chưa phân loại", "funnel");
  mk(LIKE, "Thích", "heart");
  mk(DISLIKE, "Không thích", "thumbs-down");
  // Hán tự tách riêng vì học chữ và học từ là hai buổi khác nhau: một buổi chỉ
  // chữ thì mỗi chữ được nhìn kỹ, chứ trộn lẫn thì chữ luôn bị từ lấn át.
  // Bên tiếng Anh không có ngăn này nên cũng không hiện.
  if (NGU === "ja") mk(HANTU, "Hán tự", "text-aa");
  activeDecks().forEach((d) => mk(d.id, d.name, "folder-simple"));

  const add = el("button", "chip add");
  add.type = "button";
  add.appendChild(ic("folder-plus", { size: 16 }));
  add.appendChild(el("span", "grow", "Sổ mới"));
  add.addEventListener("click", createDeck);
  bar.appendChild(add);

  // Hai nhãn cố định (Thích / Không thích) không cho đổi tên hay xoá.
  const real = current !== ALL && current !== NONE && current !== LIKE && current !== DISLIKE && current !== HANTU;
  $("deckActions").style.display = real ? "" : "none";
}

async function createDeck() {
  const name = (prompt("Tên sổ con mới (ví dụ: Bài 5 - Kanji):") || "").trim();
  if (!name) return;
  const id = "d_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const d = (await getStore()).decks;
  // Gắn nhãn ngôn ngữ ngay: sổ tiếng Nhật không được lẫn sang danh sách
  // tiếng Anh, và ngược lại.
  d[id] = { id, name, ngu: NGU, ts: Date.now() };
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
  if (d[current]) d[current] = Object.assign({}, d[current], { name, ts: Date.now() });
  await setDecks(d);
  await load();
  syncSoon();
}

async function deleteDeck() {
  if (current === ALL || current === NONE) return;
  const nm = deckName(current);
  if (!confirm('Xoá sổ "' + nm + '"? Các mục trong sổ sẽ chuyển về "Chưa phân loại", không bị mất.')) return;
  const cu = current;
  await capNhat((nb, dks) => {
    const now = Date.now();
    for (const key in nb) {
      if (nb[key].deck === cu) {
        const e = Object.assign({}, nb[key], { ts: now });
        delete e.deck;
        nb[key] = e;
      }
    }
    dks[cu] = { id: cu, name: nm, del: true, ts: now };   // bia mộ
  });
  current = ALL;
  await load();
  syncSoon();
}

async function moveWord(key, deckId) {
  await capNhat((nb) => {
    const e = nb[key];
    if (!e) return;
    const ne = Object.assign({}, e, { ts: Date.now() });
    if (deckId === NONE) delete ne.deck;
    else ne.deck = deckId;
    nb[key] = ne;
  });
  await load();
  syncSoon();
}

/* ==================================================================== */
/* Phát âm tiếng Anh                                                    */
/* ==================================================================== */

/**
 * Ưu tiên file audio thật do từ điển trả về; không có (hoặc link hỏng) thì
 * mới đọc bằng giọng máy. Giọng máy đọc tiếng Anh nghe được, nhưng trọng âm
 * thì thường sai — mà trọng âm mới là thứ người Việt hay nhớ nhầm.
 */
const _audioCache = new Map();
/**
 * Âm Hán Việt của những chữ Hán trong từ. Với người Việt học tiếng Nhật đây là
 * cái móc trí nhớ mạnh nhất: 「職場」 đọc là しょくば thì phải học thuộc, nhưng
 * biết nó là "Chức Trường" thì gần như không cần học.
 */
function hanVietOf(word) {
  const DB = (typeof window !== "undefined" && window.KANJI) || {};
  const parts = [];
  let hasKanji = false;
  for (const ch of (word || "")) {
    const c = ch.codePointAt(0);
    const isCJK = (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf) || (c >= 0xf900 && c <= 0xfaff);
    if (!isCJK) continue;
    hasKanji = true;
    const d = DB[ch];
    parts.push(d && d.hv ? d.hv.split(/\s+/)[0] : "?");
  }
  if (!hasKanji || !parts.length) return "";
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function getAudio(url) {
  let a = _audioCache.get(url);
  if (!a) { a = new Audio(url); a.preload = "auto"; _audioCache.set(url, a); }
  return a;
}
/**
 * Đọc to. Giọng chọn theo ngôn ngữ đang bật — đọc 「犬」 bằng giọng tiếng Anh
 * thì ra một thứ không ai nghe được.
 */
function ttsSpeak(text) {
  try {
    speechSynthesis.cancel();
    const ja = (typeof NGU !== "undefined" && NGU === "ja");
    const ma = ja ? "ja" : "en";
    const u = new SpeechSynthesisUtterance(text);
    u.lang = ja ? "ja-JP" : "en-US";
    u.rate = 0.9;
    const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith(ma));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) { /* máy không có giọng thứ tiếng đó */ }
}
function speak(text, audio) {
  if (audio) {
    try {
      const a = getAudio(audio);
      a.onerror = () => ttsSpeak(text);      // link mp3 hỏng -> đọc bằng giọng máy
      a.currentTime = 0;
      const p = a.play();
      if (p && p.catch) p.catch(() => ttsSpeak(text));
      return;
    } catch (e) { /* rơi xuống giọng máy */ }
  }
  ttsSpeak(text);
}
// Gọi sớm một lần để trình duyệt nạp danh sách giọng, tránh lần đọc đầu bị câm.
try { speechSynthesis.getVoices(); } catch (e) {}

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
 * Nên mỗi mục có hai chỗ chỉnh được:
 *   means  — bản dịch, sửa thẳng, mỗi dòng một nghĩa
 *   note   — ghi chú riêng: ngữ cảnh, thuật ngữ tương đương, cách dùng
 *
 * Bản gốc của máy được cất vào `mOrig` chứ không xoá, để lúc nào muốn so lại
 * hoặc thấy mình sửa hỏng thì còn đường quay về.
 */
let dangSua = null;   // { key, tab: "trans" | "note" }

function moSua(it, tab) {
  dangSua = { key: it.key, tab: tab || "trans" };

  const laGhiChu = tab === "note";
  $("edTitle").textContent = laGhiChu ? "Ghi chú cho mục này" : "Sửa bản dịch";
  $("edIcon").innerHTML = window.Icon(laGhiChu ? "note-pencil" : "translate", { size: 20 });
  $("edSub").textContent = laGhiChu
    ? "Ghi lại ngữ cảnh, thuật ngữ tương đương, cách dùng — thứ mà từ điển không nói."
    : "Chỉnh lại cho đúng cách nói của chuyên ngành bạn. Mỗi dòng là một nghĩa.";

  $("edOrig").textContent = it.word || "";
  $("edTrans").value = (it.means || []).join("\n");
  $("edNote").value = it.note || "";

  // Nhắc bản gốc của máy, và cho đường quay về nếu đã từng sửa.
  const goc = it.mOrig && it.mOrig.length ? it.mOrig.join("; ") : "";
  $("edOrigHint").textContent = goc ? "Bản máy dịch ban đầu: " + goc : "";
  $("edRestore").style.display = goc ? "" : "none";

  $("editSheet").classList.add("show");
  setTimeout(() => $(laGhiChu ? "edNote" : "edTrans").focus(), 40);
}

function dongSua() {
  $("editSheet").classList.remove("show");
  dangSua = null;
}

async function luuSua() {
  if (!dangSua) return;
  const key = dangSua.key;
  const dong = $("edTrans").value.split("\n").map((x) => x.trim()).filter(Boolean);
  const ghiChu = $("edNote").value.trim();

  const doiNghia = await capNhat((nb) => {
    const e = nb[key];
    if (!e || e.del) return null;
    const cu = (e.means || []).map(meanToStr);
    const doi = dong.join("\n") !== cu.join("\n");
    const ne = Object.assign({}, e, { ts: Date.now() });
    if (doi) {
      // Cất bản gốc lại đúng MỘT lần: lần sửa thứ hai không được đè bản gốc bằng
      // chính bản sửa lần trước, nếu không thì nút khôi phục thành vô nghĩa.
      if (!ne.mOrig) ne.mOrig = cu;
      ne.means = dong;
      ne.mEdit = 1;
    }
    if (ghiChu) ne.note = ghiChu; else delete ne.note;
    nb[key] = ne;
    return doi;
  });
  if (doiNghia === null) { dongSua(); return; }
  dongSua();
  await load();
  // Sửa ngay giữa buổi học thì thẻ đang mở phải đổi theo luôn: `session.queue`
  // giữ một bản chụp của mục, `load()` không đụng tới nó, nên không cập nhật ở
  // đây thì thẻ vẫn nằm đó với nghĩa cũ — đúng cái nghĩa vừa sửa vì nó sai.
  const dangHoc = session.queue[0];
  if (dangHoc && dangHoc.key === key) {
    const s2 = await getStore();
    if (s2.nb[key]) { Object.assign(dangHoc, s2.nb[key]); showCard(true); }
  }
  syncSoon();
  mung(await theoDoi.xetHuyHieu());
  toast(doiNghia ? "Đã lưu bản dịch của bạn" : "Đã lưu ghi chú");
}

async function khoiPhucGoc() {
  if (!dangSua) return;
  const s = await getStore();
  const e = s.nb[dangSua.key];
  if (!e || !e.mOrig) return;
  $("edTrans").value = e.mOrig.join("\n");
}

$("edSave").addEventListener("click", luuSua);
$("edCancel").addEventListener("click", dongSua);
$("edRestore").addEventListener("click", khoiPhucGoc);
$("editSheet").addEventListener("click", (e) => { if (e.target.id === "editSheet") dongSua(); });

/* ==================================================================== */
/* Nhãn Thích / Không thích                                             */
/* ==================================================================== */

async function setFav(key, val, sauDo) {
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
  if (sauDo) sauDo(next);
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
    // thái mà không cần đọc màu, hợp cả với người khó phân biệt màu.
    b.innerHTML = window.Icon(iconTen, { size: 17, weight: on ? "solid" : "line" });
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      it.fav = await setFav(it.key, val);
      if (sauDo) sauDo(); else await load();
    });
    return b;
  };
  wrap.appendChild(mk(1, "heart", "like", "Thích"));
  wrap.appendChild(mk(-1, "thumbs-down", "dislike", "Không thích"));
  return wrap;
}

/* ==================================================================== */
/* Mở lại trang nguồn, tô sáng đúng đoạn đã lưu                          */
/* ==================================================================== */

// Hai lớp bổ trợ nhau:
//  1) Text Fragment (#:~:text=): trình duyệt tự cuộn + tô sáng. Chạy được cả
//     trên trang web thường LẪN trình xem PDF tích hợp của Chrome.
//  2) pendingHighlight: content script bọc <mark> bền vững, đa-node trên trang
//     web thường (đoạn dài trải nhiều thẻ, dùng prefix/suffix chọn đúng chỗ).
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
/** "1:23:45" từ số giây — dùng cho nhãn nguồn YouTube. */
function giay(t) {
  const g = Math.max(0, Math.floor(t || 0));
  const gio = Math.floor(g / 3600), phut = Math.floor((g % 3600) / 60), gy = g % 60;
  const hai = (n) => (n < 10 ? "0" : "") + n;
  return (gio ? gio + ":" + hai(phut) : phut) + ":" + hai(gy);
}

/**
 * Quay về đúng giây trong video.
 *
 * Chỗ này CHẮC hơn hẳn việc dò lại một đoạn trên trang web: mốc giây là toạ độ
 * tuyệt đối, không trôi khi trang đổi nội dung. Nếu video đang mở sẵn ở một thẻ
 * nào đó thì nhảy sang thẻ đó rồi tua — mở thêm một thẻ nữa cho cùng một video
 * là thừa, mà lại mất chỗ đang xem dở.
 */
function openYoutube(yt) {
  const t = Math.max(0, Math.floor(yt.t || 0));
  const url = "https://www.youtube.com/watch?v=" + encodeURIComponent(yt.v) + "&t=" + t + "s";
  try {
    chrome.tabs.query({ url: ["https://www.youtube.com/watch*", "https://m.youtube.com/watch*"] }, (tabs) => {
      const hit = (tabs || []).find((tb) => (tb.url || "").indexOf("v=" + yt.v) >= 0);
      if (!hit) { chrome.tabs.create({ url }); return; }
      chrome.tabs.update(hit.id, { active: true });
      if (hit.windowId != null) chrome.windows.update(hit.windowId, { focused: true });
      chrome.tabs.sendMessage(hit.id, { type: "YT_SEEK", v: yt.v, t: t }, () => {
        // Thẻ mở từ trước khi cài/nạp lại extension thì chưa có content script;
        // lúc đó tải thẳng URL kèm mốc giây là xong.
        if (chrome.runtime.lastError) chrome.tabs.update(hit.id, { url: url });
      });
    });
  } catch (e) { chrome.tabs.create({ url }); }
}

function openSource(it) {
  const src = it.src;
  if (!src || !src.url) return;
  if (src.yt && src.yt.v) { openYoutube(src.yt); return; }
  const text = (src.sel || it.word || "").replace(/\s+/g, " ").trim();
  const url = fragUrl(src);
  if (src.pdf) {
    // PDF: chỉ dựa vào Text Fragment (content script không chạy trong trình xem PDF).
    // Chép sẵn đoạn để nếu trình xem PDF không hỗ trợ thì Ctrl+F dán tìm nhanh.
    const q = text.split(" ").slice(0, 10).join(" ");
    try { if (navigator.clipboard) navigator.clipboard.writeText(q); } catch (e) {}
    chrome.tabs.create({ url });
    return;
  }
  chrome.storage.local.set({
    pendingHighlight: { url: src.url, text: text, prefix: src.prefix || "", suffix: src.suffix || "", ts: Date.now() }
  }, () => { chrome.tabs.create({ url }); });
}

/* ==================================================================== */
/* Danh sách                                                            */
/* ==================================================================== */

function currentActiveSet() {
  const a = active(items);
  if (current === ALL) return a;
  if (current === NONE) return a.filter((it) => !it.deck);
  if (current === LIKE) return a.filter((it) => it.fav === 1);
  if (current === DISLIKE) return a.filter((it) => it.fav === -1);
  if (current === HANTU) return a.filter((it) => it.dict === "kanji");
  return a.filter((it) => it.deck === current);
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

function draw() {
  const kw = $("filter").value.trim().toLowerCase();
  const base = currentActiveSet();
  const rows = base.filter((it) => {
    if (!kw) return true;
    const hay = (it.word + " " + (it.reading || "") + " " + (it.means || []).join(" ") + " " + (it.note || "")).toLowerCase();
    return hay.includes(kw);
  });

  $("count").textContent = "Đang hiện " + rows.length + " mục"
    + (rows.length !== base.length ? " trong " + base.length : "");

  const den = dueList(base).length;
  $("dueCount").textContent = String(den);
  const chip = $("dueChip");
  if (den) { chip.style.display = ""; chip.textContent = den + " mục đến hạn"; }
  else chip.style.display = "none";

  const listEl = $("list");
  listEl.innerHTML = "";

  if (!rows.length) {
    const d = el("div", "empty");
    d.appendChild(ic("notebook", { size: 40 }));
    d.appendChild(el("div", null, active(items).length
      ? "Không có mục nào ở đây."
      : "Chưa có mục nào. Tra một từ rồi bấm “Lưu”."));
    listEl.appendChild(d);
    return;
  }

  const dks = activeDecks();
  const now = Date.now();

  for (const it of rows) {
    const row = el("div", "entry" + (it.kind === "sent" ? " sent" : "") + (it.dict === "kanji" ? " kanji" : ""));
    const body = el("div", "body");

    /* --- dòng đầu: từ, cách đọc, loa, nhãn --- */
    const head = el("div", "head");
    head.appendChild(el("span", "w" + (NGU === "ja" ? " ja" : ""), it.word));
    if (it.reading) {
      const r = el("span", "r", it.reading);
      // Cách đọc suy từ phiên âm La-tinh có thể trật (ō là おう hay おお?), nên
      // nói thẳng ra thay vì để người học tin nhầm là từ điển bảo thế.
      if (it.docSuy) { r.classList.add("suy"); r.title = "Cách đọc suy ra từ phiên âm, có thể chưa chuẩn"; }
      head.appendChild(r);
    }

    const spk = nutIcon("speaker-high", "Phát âm", "", 17);
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
    if (it.deck && deckName(it.deck) && current === ALL) {
      const t = el("span", "tag");
      t.appendChild(ic("folder-simple", { size: 12 }));
      t.appendChild(el("span", null, deckName(it.deck)));
      head.appendChild(t);
    }
    body.appendChild(head);

    /* --- Hán Việt, nghĩa, ghi chú --- */
    const hvStr = hanVietOf(it.word);
    if (hvStr) body.appendChild(el("div", "hv", "Hán Việt: " + hvStr));
    if (it.dict === "kanji") {
      const meta = window.HanTu.META(it.kanji);
      if (meta) body.appendChild(el("div", "t-tiny faint", meta));
    }
    if (it.means && it.means.length) {
      body.appendChild(el("div", "m", it.means.slice(0, 4).join("; ")));
    }
    if (it.note && it.note.trim()) body.appendChild(khoiGhiChu(it.note.trim()));

    /* --- dòng chân: nguồn + thời gian --- */
    const meta = el("div", "meta");
    if (it.src && it.src.url) {
      const s = el("span", "srcline");
      const yt = it.src.yt;
      if (yt && yt.v) {
        // Nguồn video thì cái đáng hiện là PHÚT THỨ MẤY, không phải "youtube.com".
        s.appendChild(ic("subtitles", { size: 13 }));
        s.appendChild(el("span", null, "YouTube · " + giay(yt.t)));
        s.title = "Nghe lại: " + (it.src.title || "") + (yt.kenh ? " — " + yt.kenh : "");
      } else {
        let hostn = it.src.url;
        try { hostn = new URL(it.src.url).hostname.replace(/^www\./, ""); } catch (e) {}
        s.appendChild(ic("link-simple", { size: 13 }));
        s.appendChild(el("span", null, hostn));
        s.title = "Lưu từ: " + (it.src.title || it.src.url);
      }
      meta.appendChild(s);
    }
    meta.appendChild(el("span", null, fmtDate(it.ts)));
    body.appendChild(meta);

    row.appendChild(body);

    /* --- cột điều khiển bên phải --- */
    const ctl = el("div", "ctl");

    const hang = el("div", "rowx");
    hang.style.gap = "2px";

    const sua = nutIcon("translate", "Sửa bản dịch cho đúng chuyên ngành", "", 17);
    sua.addEventListener("click", () => moSua(it, "trans"));
    hang.appendChild(sua);

    const gc = nutIcon("note-pencil", it.note ? "Sửa ghi chú" : "Thêm ghi chú", it.note ? "on" : "", 17);
    gc.addEventListener("click", () => moSua(it, "note"));
    hang.appendChild(gc);

    if (it.src && it.src.url) {
      // Nguồn video thì việc sắp làm không phải "mở trang" mà là "nghe lại đúng
      // chỗ đó" — nói đúng việc thì đỡ phải đoán.
      const laYt = !!(it.src.yt && it.src.yt.v);
      const open = nutIcon(laYt ? "subtitles" : "link-simple",
        laYt ? "Nghe lại đúng chỗ này trong video (" + giay(it.src.yt.t) + ")"
             : "Mở lại trang nguồn và tô sáng vị trí đã lưu", "", 17);
      open.addEventListener("click", () => openSource(it));
      hang.appendChild(open);
    }

    const del = nutIcon("trash", "Xoá khỏi sổ tay", "danger", 17);
    del.addEventListener("click", async () => {
      await capNhat((nb) => {
        nb[it.key] = window.Muc.biaMo(it);
      });
      await load();
      syncSoon();
      toast("Đã xoá “" + it.word.slice(0, 24) + "”");
    });
    hang.appendChild(del);
    ctl.appendChild(hang);

    const sel = document.createElement("select");
    sel.title = "Chuyển vào sổ";
    sel.style.cssText = "font-size:12.5px;padding:6px 8px;max-width:150px;border-radius:var(--r-xs)";
    const optNone = document.createElement("option");
    optNone.value = NONE; optNone.textContent = "Chưa phân loại";
    sel.appendChild(optNone);
    dks.forEach((d) => {
      const o = document.createElement("option");
      o.value = d.id; o.textContent = d.name;
      sel.appendChild(o);
    });
    sel.value = it.deck && deckName(it.deck) ? it.deck : NONE;
    sel.addEventListener("change", () => moveWord(it.key, sel.value));
    ctl.appendChild(sel);

    row.appendChild(ctl);
    listEl.appendChild(row);
  }
}

/* ==================================================================== */
/* Buổi học                                                             */
/* ==================================================================== */

let session = { queue: [], done: 0, again: 0, deleted: 0 };
let lastDeleted = null;
const ovl = $("studyOverlay");

function theCardHienTai() { return session.queue[0]; }

function renderStudyFav(it) {
  const box = $("stFav");
  box.innerHTML = "";
  const mk = (val, iconTen) => {
    const on = it.fav === val;
    const b = el("button", "btn sm" + (on ? " tinted" : ""));
    b.type = "button";
    b.innerHTML = window.Icon(iconTen, { size: 17, weight: on ? "solid" : "line" });
    b.appendChild(el("span", "lb", val === 1 ? "Thích" : "Không thích"));
    b.addEventListener("click", async () => {
      const next = await setFav(it.key, val);
      it.fav = next;
      renderStudyFav(it);
    });
    return b;
  };
  box.appendChild(mk(1, "heart"));
  box.appendChild(mk(-1, "thumbs-down"));
}

function startStudy() {
  const due = dueList(currentActiveSet());
  if (!due.length) {
    toast("Không có mục nào đến hạn trong mục này. Quay lại sau nhé!", "bad");
    return;
  }
  session = { queue: due.slice().sort(() => Math.random() - 0.5), done: 0, again: 0, deleted: 0 };
  lastDeleted = null;
  $("stUndo").style.display = "none";
  $("stBody").style.display = "";
  $("stDone").style.display = "none";
  ovl.classList.add("show");
  showCard();
}

/**
 * @param {boolean} [giuLat] thẻ đang lật rồi thì vẽ lại luôn ở trạng thái đã
 *   lật. Dùng khi sửa nghĩa ngay giữa buổi học: úp thẻ lại lúc đó chẳng khác
 *   gì bắt đoán lại một câu vừa mới đọc đáp án.
 */
function showCard(giuLat) {
  const it = theCardHienTai();
  if (!it) { finishStudy(); return; }
  const daLat = giuLat && $("stGrade").style.display !== "none";

  $("stBody").style.display = "";
  $("stDone").style.display = "none";
  $("stProg").textContent = "Còn " + session.queue.length + " mục · đã xong " + session.done;

  $("stCard").className = "studycard" + (it.kind === "sent" ? " sent" : "") + (it.dict === "kanji" ? " kanji" : "");
  $("stWord").textContent = it.word;
  $("stWord").className = "cw" + (NGU === "ja" ? " ja" : "");
  renderStudyFav(it);

  const src = $("stSrc");
  if (it.src && it.src.url) {
    const laYt = !!(it.src.yt && it.src.yt.v);
    src.innerHTML = window.Icon(laYt ? "subtitles" : "link-simple", { size: 15 })
      + '<span class="lb">' + (laYt ? "Nghe lại " + giay(it.src.yt.t) : "Mở nguồn") + "</span>";
    src.style.display = ""; src.onclick = () => openSource(it);
  } else { src.style.display = "none"; src.onclick = null; }

  $("stRead").textContent = "";
  $("stMean").innerHTML = "";
  $("stMyNote").innerHTML = "";
  $("stReveal").style.display = "";
  $("stGrade").style.display = "none";
  if (daLat) revealCard();
}

function revealCard() {
  const it = theCardHienTai();
  if (!it) return;
  const hvS = hanVietOf(it.word);
  $("stRead").textContent = (it.reading || "") + (hvS ? ((it.reading ? "\u3000·\u3000" : "") + "Hán Việt: " + hvS) : "");
  if (it.dict === "kanji") {
    const meta = window.HanTu.META(it.kanji);
    if (meta) $("stMean").appendChild(el("div", "t-small faint", meta));
  }
  if (it.means && it.means.length) {
    const ul = document.createElement("ul");
    it.means.slice(0, 5).forEach((m) => ul.appendChild(el("li", null, m)));
    // KHÔNG xoá trắng ở đây: showCard() đã dọn rồi, mà chữ Hán thì dòng nét/bộ
    // vừa thêm phía trên cũng nằm trong ô này — xoá là mất.
    $("stMean").appendChild(ul);
  }
  // Ghi chú riêng chỉ hiện SAU khi lật thẻ — nó thường chứa luôn đáp án.
  if (it.note && it.note.trim()) $("stMyNote").appendChild(khoiGhiChu(it.note.trim()));
  $("stReveal").style.display = "none";
  $("stGrade").style.display = "";
}

async function grade(remembered) {
  const it = session.queue.shift();
  if (!it) return;
  await gradeWord(it.key, remembered);
  if (remembered) session.done++;
  else { session.again++; session.queue.push(Object.assign({}, it)); }   // quên -> học lại cuối hàng

  // Mọi lượt chấm đều được ghi vào tiến độ, kể cả lượt "quên": công sức bỏ ra là
  // như nhau, mà đếm cả lượt quên mới khuyến khích người ta dám chấm thật.
  await load();
  const moi = await theoDoi.ghiLuotOn(remembered);
  syncSoon();

  if (moi.length) {
    // Chờ xem hết chúc mừng rồi mới sang thẻ tiếp — nếu không thì popup che
    // mất thẻ mới và người dùng bấm nhầm.
    window.TienDo.anMung(moi, showCard);
  } else {
    showCard();
  }
}

async function deleteCurrentCard() {
  const it = theCardHienTai();
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
  syncSoon();
  showCard();
}

async function undoDelete() {
  if (!lastDeleted) return;
  const cu = lastDeleted;
  await capNhat((nb) => {
    nb[cu.key] = Object.assign({}, cu.entry, { ts: Date.now() });
  });
  lastDeleted = null;
  $("stUndo").style.display = "none";
  await load();
  syncSoon();
}

async function finishStudy() {
  $("stBody").style.display = "none";
  $("stDone").style.display = "";
  $("stProg").textContent = "";
  $("stDoneIcon").innerHTML = window.Icon("confetti", { size: 56, weight: "duo" });

  const view = await theoDoi.xem();
  const phan = ["Đã thuộc " + session.done + " mục"];
  if (session.again) phan.push("học lại " + session.again + " lượt");
  if (session.deleted) phan.push("đã xoá " + session.deleted + " mục");
  phan.push(view.homNay.dat
    ? "Hôm nay đạt mục tiêu rồi — chuỗi " + Math.max(1, view.chuoi.hienTai) + " ngày."
    : "Còn " + view.homNay.conLai + " lượt nữa là đạt mục tiêu hôm nay.");
  $("stSummary").textContent = phan.join(" · ");

  await load();
  syncSoon();
}

function closeStudy() {
  ovl.classList.remove("show");
  load();
  if ($("viewProgress").classList.contains("show")) veTienDo();
}

$("study").addEventListener("click", startStudy);
$("stReveal").addEventListener("click", revealCard);
$("gKnow").addEventListener("click", () => grade(true));
$("gForgot").addEventListener("click", () => grade(false));
$("stSpk").addEventListener("click", () => { const it = theCardHienTai(); if (it) speak(it.word, it.audio); });
$("stClose").addEventListener("click", closeStudy);
$("stDoneClose").addEventListener("click", closeStudy);
$("stDel").addEventListener("click", deleteCurrentCard);
$("stUndoBtn").addEventListener("click", undoDelete);
$("stEdit").addEventListener("click", () => { const it = theCardHienTai(); if (it) moSua(it, "trans"); });
$("stNote").addEventListener("click", () => { const it = theCardHienTai(); if (it) moSua(it, "note"); });

document.addEventListener("keydown", (e) => {
  if ($("editSheet").classList.contains("show")) {
    if (e.key === "Escape") dongSua();
    // Ctrl+Enter lưu: trong ô nhiều dòng, Enter phải là xuống dòng.
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); luuSua(); }
    return;
  }
  if (!ovl.classList.contains("show")) return;
  if (e.key === "Escape") closeStudy();
  else if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    if ($("stReveal").style.display !== "none") revealCard();
  } else if (e.key === "1" && $("stGrade").style.display !== "none") grade(false);
  else if (e.key === "2" && $("stGrade").style.display !== "none") grade(true);
  else if (e.key === "0" || e.key === "Delete") { e.preventDefault(); deleteCurrentCard(); }
});

/* ==================================================================== */
/* Xuất file (theo mục đang chọn)                                       */
/* ==================================================================== */

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
  if (current === HANTU) return "hantu";
  return (deckName(current) || "so").replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();
}
function exportAnki() {
  const list = currentActiveSet();
  if (!list.length) return;
  const lines = list.map((it) => {
    const front = safe(it.word);
    const read = it.reading ? (NGU === "ja" ? "【" + safe(it.reading) + "】 " : "/" + safe(it.reading) + "/ ") : "";
    // Ghi chú đi kèm mặt sau: đó thường là phần đắt nhất của thẻ.
    const note = it.note ? "<br><i>" + safe(it.note) + "</i>" : "";
    const back = read + safe((it.means || []).join("; ")) + note;
    return front + "\t" + back + "\t" + safe(deckName(it.deck) || "");
  });
  download("neutrondict-anki-" + fileTag() + ".tsv", lines.join("\n"), "text/tab-separated-values;charset=utf-8");
}
function csvCell(s) { s = String(s == null ? "" : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function exportCsv() {
  const list = currentActiveSet();
  if (!list.length) return;
  const header = ["Từ", "Phiên âm (IPA)", "Nghĩa", "Ghi chú", "Đã sửa", "Sổ", "Hướng", "Ngày lưu"];
  const rows = list.map((it) => [
    it.word, it.reading || "", (it.means || []).join("; "), it.note || "",
    it.mEdit ? "x" : "", deckName(it.deck) || "", dirLabel(it.dict), fmtDate(it.ts)
  ].map(csvCell).join(","));
  download("neutrondict-sotay-" + fileTag() + ".csv",
    "﻿" + header.map(csvCell).join(",") + "\n" + rows.join("\n"), "text/csv;charset=utf-8");
}

/* ==================================================================== */
/* Sao lưu / nạp                                                        */
/* ==================================================================== */

async function backupJson() {
  const s = await getStore();
  const { hoc } = await chrome.storage.local.get("hoc");
  download("neutrondict-sotay-backup.json",
    JSON.stringify({ notebook: s.nb, decks: s.decks, hoc: hoc || null }),
    "application/json;charset=utf-8");
}
function mergeLocal(a, b) {
  const out = {};
  [a || {}, b || {}].forEach((src) => {
    for (const k in src) { const e = src[k]; if (!out[k] || (e.ts || 0) > (out[k].ts || 0)) out[k] = e; }
  });
  return out;
}
async function restoreJson(file) {
  try {
    const imp = JSON.parse(await file.text());
    // Hỗ trợ cả file cũ (chỉ là object notebook) lẫn file mới {notebook,decks,hoc}.
    const impNb = (imp && imp.notebook !== undefined) ? (imp.notebook || {}) : (imp || {});
    const impDecks = (imp && imp.decks) || {};
    await capNhat((nb, dks) => {
      Object.assign(nb, mergeLocal(nb, impNb));
      Object.assign(dks, mergeLocal(dks, impDecks));
    });
    if (imp && imp.hoc) {
      const cur = (await chrome.storage.local.get("hoc")).hoc;
      const gop = window.TienDo.tron(cur, imp.hoc);
      await chrome.storage.local.set({ hoc: gop });
      theoDoi.dat(gop);
    }
    await load();
    syncSoon();
    setStatus("Đã nạp file và trộn vào sổ tay.");
    toast("Đã nạp file sao lưu");
  } catch (e) {
    setStatus("File không hợp lệ.");
    toast("File không hợp lệ", "bad");
  }
}

async function clearAll() {
  const list = currentActiveSet();
  if (!list.length) return;
  const where = current === ALL ? "toàn bộ sổ tay"
    : ('mục "' + (current === NONE ? "Chưa phân loại" : (deckName(current) || "đang chọn")) + '"');
  if (!confirm("Xoá " + list.length + " mục trong " + where + "? Việc xoá cũng đồng bộ sang máy khác.")) return;
  await capNhat((nb) => {
    const now = Date.now();
    for (const it of list) nb[it.key] = window.Muc.biaMo(it);
  });
  await load();
  syncSoon();
}

/* ==================================================================== */
/* Đồng bộ                                                              */
/* ==================================================================== */

function setStatus(t) { $("syncStatus").textContent = t; }

/*
 * Mỗi ngôn ngữ một cloud riêng, đúng như hồi còn là hai extension.
 *
 * Cặp khoá của tiếng Anh giữ nguyên tên cũ ("syncUrl"/"syncToken"), nên người
 * đang dùng NeutronDict không phải khai lại gì — cloud tiếng Anh chạy tiếp y
 * như trước. Tiếng Nhật dùng cặp mới, khai một lần.
 */
async function loadConfig() {
  const k = window.Ngu.khoaSync(NGU);
  const kho = await chrome.storage.local.get([k.url, k.token]);
  $("syncUrl").value = kho[k.url] || "";
  $("syncToken").value = kho[k.token] || "";
  const nh = $("syncNhan");
  if (nh) nh.textContent = "Đang cấu hình cloud tiếng " + window.Ngu.ten(NGU);
  return { syncUrl: kho[k.url], syncToken: kho[k.token] };
}
async function saveConfig() {
  const k = window.Ngu.khoaSync(NGU);
  const syncUrl = $("syncUrl").value.trim();
  const syncToken = $("syncToken").value.trim();
  await chrome.storage.local.set({ [k.url]: syncUrl, [k.token]: syncToken });
  setStatus(syncUrl
    ? "Đã lưu cấu hình đồng bộ cho tiếng " + window.Ngu.ten(NGU) + "."
    : "Đã xoá cấu hình tiếng " + window.Ngu.ten(NGU) + ".");
}
function syncNow() {
  setStatus("Đang đồng bộ…");
  const cua = NGU;   // đổi ngôn ngữ giữa chừng thì kết quả cũ không được ghi đè
  return new Promise((xong) => {
    chrome.runtime.sendMessage({ type: "SYNC_NOW", ngu: cua }, async (res) => {
      if (chrome.runtime.lastError) { setStatus("Lỗi: " + chrome.runtime.lastError.message); xong(); return; }
      if (res && res.ok) {
        if (cua === NGU) {
          await theoDoi.nap(true);
          await load();
          if ($("viewProgress").classList.contains("show")) veTienDo();
          setStatus("Đã đồng bộ · " + res.count + " mục · " + new Date().toLocaleTimeString("vi-VN"));
        }
      } else {
        setStatus("Không đồng bộ được: " + ((res && res.error) || "lỗi không rõ"));
      }
      xong();
    });
  });
}
function syncSoon() { try { chrome.runtime.sendMessage({ type: "SYNC_SOON", ngu: NGU }); } catch (e) {} }

// Quay lại tab Sổ tay -> kéo dữ liệu mới (nếu đã cấu hình đồng bộ).
document.addEventListener("visibilitychange", async () => {
  if (document.hidden) return;
  const { syncUrl } = await chrome.storage.local.get("syncUrl");
  if (syncUrl) syncNow();
});

/* ==================================================================== */
/* Cài đặt tra nhanh                                                    */
/* ==================================================================== */

const SET_DEFAULTS = { inline: true, requireCtrl: false, maxLen: 30, translate: true, maxSent: 400 };

async function loadSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  const S = Object.assign({}, SET_DEFAULTS, settings || {});
  $("setInline").checked = !!S.inline;
  $("setCtrl").checked = !!S.requireCtrl;
  $("setLen").value = S.maxLen || 30;
  $("setTrans").checked = S.translate !== false;
}
async function saveSettings() {
  await chrome.storage.local.set({
    settings: {
      inline: $("setInline").checked,
      requireCtrl: $("setCtrl").checked,
      maxLen: Math.max(5, Math.min(200, parseInt($("setLen").value, 10) || 30)),
      translate: $("setTrans").checked,
      maxSent: 400
    }
  });
  $("setStatus").textContent = "Đã lưu. Tải lại trang web đang mở để áp dụng ngay.";
}
async function clearCache() {
  await chrome.storage.local.set({ cache: {}, trCache: {} });
  $("setStatus").textContent = "Đã xoá bộ nhớ đệm tra từ.";
}

/* ==================================================================== */
/* Chuyển màn Sổ tay / Tiến độ                                          */
/* ==================================================================== */

function moMan(ten) {
  const laDs = ten === "list";
  $("viewList").classList.toggle("show", laDs);
  $("viewProgress").classList.toggle("show", !laDs);
  $("pageList").classList.toggle("active", laDs);
  $("pageProgress").classList.toggle("active", !laDs);
  if (!laDs) veTienDo();
}
$("pageList").addEventListener("click", () => moMan("list"));
$("pageProgress").addEventListener("click", () => moMan("progress"));

/* ==================================================================== */
/* Gắn icon vào phần khung tĩnh của HTML                                */
/* ==================================================================== */

function gaiIcon() {
  $("brandMark").innerHTML = window.Icon("notebook", { size: 21, weight: "solid" });
  $("icTool").innerHTML = window.Icon("export", { size: 18 });
  $("icSync").innerHTML = window.Icon("cloud-arrow-up", { size: 18 });
  $("icSet").innerHTML = window.Icon("gear-six", { size: 18 });
  ["cr1", "cr2", "cr3"].forEach((id) => { $(id).innerHTML = window.Icon("caret-right", { size: 16 }); });

  $("ebDecks").innerHTML = window.Icon("folder-simple", { size: 15 }) + "<span>Sổ con</span>";
  $("pageList").innerHTML = window.Icon("notebook", { size: 17 }) + '<span class="lb">Sổ tay</span>';
  $("pageProgress").innerHTML = window.Icon("chart-line-up", { size: 17 }) + '<span class="lb">Tiến độ</span>';

  const st = $("study");
  const den = st.querySelector(".tag");
  st.innerHTML = window.Icon("graduation-cap", { size: 20 }) + '<span class="lb">Học ngay</span>';
  st.appendChild(den);

  $("filter").parentElement.insertBefore(ic("magnifying-glass", { size: 18 }), $("filter"));

  $("stSpk").innerHTML = window.Icon("speaker-high", { size: 22 });
  const gan = (id, ten, chu) => {
    const b = $(id);
    b.innerHTML = window.Icon(ten, { size: 15 }) + '<span class="lb">' + chu + "</span>";
  };
  gan("stSrc", "link-simple", "Mở nguồn");
  gan("stEdit", "translate", "Sửa bản dịch");
  gan("stNote", "note-pencil", "Ghi chú");
  gan("gForgot", "arrow-counter-clockwise", "Quên");
  gan("gKnow", "check", "Nhớ");
  gan("stReveal", "eye", "Hiện nghĩa");
  gan("stDel", "trash", "Đã thuộc hẳn — xoá");
  gan("stClose", "arrow-left", "Đóng");
  gan("ipaGuide", "text-aa", "Hướng dẫn đọc IPA");

  // Lá cờ trong hộp "Về tác giả" — vẽ tay, không phải emoji.
  $("abFlag").innerHTML =
    '<svg width="30" height="20" viewBox="0 0 30 20" style="border-radius:3px;box-shadow:var(--sh-1)">' +
    '<rect width="30" height="20" fill="#da251d"/>' +
    '<polygon points="15,3.5 16.5,7.94 21.18,8 17.43,10.79 18.82,15.26 15,12.55 11.18,15.26 12.57,10.79 8.82,8 13.5,7.94" fill="#ffff00"/></svg>';
}

/* ==================================================================== */
/* Sự kiện                                                              */
/* ==================================================================== */

$("filter").addEventListener("input", draw);
$("exAnki").addEventListener("click", exportAnki);
$("exCsv").addEventListener("click", exportCsv);
$("backup").addEventListener("click", backupJson);
$("restore").addEventListener("click", () => $("restoreFile").click());
$("restoreFile").addEventListener("change", (e) => {
  if (e.target.files[0]) restoreJson(e.target.files[0]);
  e.target.value = "";
});
$("clear").addEventListener("click", clearAll);
$("renameDeck").addEventListener("click", renameDeck);
$("deleteDeck").addEventListener("click", deleteDeck);
$("saveCfg").addEventListener("click", saveConfig);
$("syncNow").addEventListener("click", syncNow);
$("saveSet").addEventListener("click", saveSettings);
$("clearCache").addEventListener("click", clearCache);

$("ipaGuide").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("ipa-guide.html") });
});

$("creditBtn").addEventListener("click", () => $("aboutSheet").classList.add("show"));
$("abClose").addEventListener("click", () => $("aboutSheet").classList.remove("show"));
$("aboutSheet").addEventListener("click", (e) => {
  if (e.target.id === "aboutSheet") e.target.classList.remove("show");
});

/* ==================================================================== */
/* Khởi động                                                            */
/* ==================================================================== */

/** Xoá huy hiệu của ngôn ngữ chưa hề có hoạt động nào — xem Ngu.donHuyHieuLac. */
async function donHuyHieu() {
  const kho = await chrome.storage.local.get(["hoc", "notebook"]);
  const kq = window.Ngu.donHuyHieuLac(kho.hoc, kho.notebook || {});
  if (!kq.doi.length) return;
  await chrome.storage.local.set({ hoc: kq.hoc });
  await theoDoi.nap(true);
}

/**
 * Nhờ nền suy cách đọc cho những mục tiếng Nhật còn thiếu furigana.
 *
 * Mỗi lượt mở sổ chỉ vá một nhúm — sổ vài trăm từ mà vá hết trong một lượt thì
 * thành vài trăm lượt gọi mạng. Mở thêm vài lần là hết, mà chờ thì không phải
 * chờ: hàm này chạy nền, xong mới vẽ lại.
 */
function vaFurigana() {
  try {
    chrome.runtime.sendMessage({ type: "VA_FURIGANA", toiDa: 25 }, (kq) => {
      if (chrome.runtime.lastError) return;
      if (kq && kq.ok && kq.count) load();
    });
  } catch (e) { /* không vá được thì thôi, sổ vẫn dùng bình thường */ }
}

/** Vẽ lại nút chuyển ngôn ngữ và mọi chỗ ăn theo nó. */
function veNgu() {
  $("nguEn").classList.toggle("active", NGU === "en");
  $("nguJa").classList.toggle("active", NGU === "ja");
  const sb = $("brandSub");
  if (sb) sb.textContent = (NGU === "ja" ? "Nhật – Việt" : "Anh – Việt") + " · sóng học tập";
  // Hướng dẫn đọc IPA chỉ có nghĩa với tiếng Anh.
  const ipa = $("ipaGuide");
  if (ipa) ipa.style.display = NGU === "ja" ? "none" : "";
  document.title = (NGU === "ja" ? "Sổ tay Nhật – Việt" : "Sổ tay Anh – Việt") + " · NeutronDict";
}

async function doiNgu(ngu) {
  if (ngu === NGU) return;
  NGU = window.Ngu.hopLe(ngu);
  const { settings } = await chrome.storage.local.get("settings");
  await chrome.storage.local.set({ settings: Object.assign({}, settings || {}, { ngu: NGU }) });
  veNgu();
  current = ALL;
  // nap(true): ÉP đọc lại. Không có cờ này thì nó trả về bản đã nạp sẵn của
  // ngôn ngữ CŨ — và màn Tiến độ hiện chuỗi ngày, huy hiệu của bên kia.
  await theoDoi.nap(true);
  await load();
  await loadConfig();
  if (NGU === "ja") vaFurigana();
  if ($("viewProgress").classList.contains("show")) veTienDo();
}

$("nguEn").addEventListener("click", () => doiNgu("en"));
$("nguJa").addEventListener("click", () => doiNgu("ja"));

(async () => {
  gaiIcon();
  const { settings } = await chrome.storage.local.get("settings");
  NGU = window.Ngu.hopLe((settings || {}).ngu);
  veNgu();
  await theoDoi.nap();
  await load();
  await loadSettings();
  // Dọn huy hiệu bị rò từ ngôn ngữ khác sang (lỗi của bản gộp đời đầu). Phải
  // dọn TRƯỚC khi đồng bộ, kẻo bản bẩn kịp đi lên cloud một lượt nữa.
  await donHuyHieu();

  // Vá furigana cho những mục đã lưu từ trước mà không có cách đọc. Không chặn
  // màn hình: xong tới đâu vẽ lại tới đó.
  vaFurigana();

  const cfg = await loadConfig();
  if (cfg.syncUrl) { $("syncBox").open = false; await syncNow(); }
  else { $("syncBox").open = true; }
  // Xét lại huy hiệu lúc mở app: có mốc chỉ phụ thuộc số mục trong sổ (lưu từ
  // điện thoại, hoặc lưu bằng chuột phải) nên không đi qua đường chấm bài.
  //
  // PHẢI đợi đồng bộ xong mới xét. Xét trước thì mình đang nhìn một bản tiến độ
  // chưa có gì, trao lại đúng những huy hiệu mà trên cloud đã có từ lâu — rồi
  // lượt đồng bộ ập tới ghi đè, và lần mở sau lại chúc mừng y hệt. Đó chính là
  // cảnh "lần nào vào cũng hiện bảng thành tích".
  mung(await theoDoi.xetHuyHieu());
})();
