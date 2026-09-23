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
// Làm sạch chuỗi trước khi gửi: bôi đen dính công thức MathJax/KaTeX kéo theo
// MathML ẩn và ký tự vô hình, làm chuỗi phình và lẫn rác.
function donDich(s) {
  return String(s || "")
    .normalize("NFC")
    .replace(/[\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Cổng gtx công khai chặn tần suất theo IP — tra một hồi là 429/403, dịch tắc
// dù câu ngắn. Xoay sang cổng Google khác (clients5) khi cổng chính bị chặn:
// hai cổng đếm riêng nên thường một cái còn sống. Cùng đường /translate_a/single
// nên dạng dữ liệu y hệt.
const GTX_HOST = [
  "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=bd",
  "https://clients5.google.com/translate_a/single?client=gtx&dt=t&dt=bd"
];
async function gtxData(from, to, text) {
  const duoi = "&sl=" + encodeURIComponent(from) + "&tl=" + encodeURIComponent(to)
    + "&q=" + encodeURIComponent(text);
  let cuoi = null;
  for (const h of GTX_HOST) {
    try { return await httpGetJson(h + duoi, { "User-Agent": GTX_UA }); }
    catch (e) { cuoi = e; }   // cổng này chặn -> thử cổng sau
  }
  throw (cuoi || new Error("gtx: mọi cổng đều trượt"));
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
/** Mã đầy đủ cho từng thứ tiếng mình có thể phải đọc. */
const GIONG = { vi: "vi-VN", ja: "ja-JP", en: "en-US" };

/**
 * @param {string} [ngu] "vi" | "ja" | "en"; không truyền thì theo ngôn ngữ đang tra.
 * @param {{rate?:number, pitch?:number}} [tuy] một tiếng reo cần đọc nhanh và
 *   cao hơn lúc đọc từ vựng, nên chỗ gọi nói rõ được.
 */
async function speak(text, audio, ngu, tuy) {
  if (audio) {
    try { const a = getAudioEl(audio); a.currentTime = 0; await a.play(); return; } catch (e) { /* rơi xuống TTS */ }
  }
  const t = tuy || {};
  // Giọng theo ngôn ngữ đang bật — đọc 「犬」 bằng giọng tiếng Anh thì ra một
  // thứ không ai nghe được. Trang Luyện nói phải đọc được CẢ HAI chiều nên nó
  // luôn nói rõ thứ tiếng, khỏi đoán.
  const ma = GIONG[ngu] || (laNhat() ? "ja-JP" : "en-US");
  const nhip = t.rate != null ? t.rate : 0.9;
  try {
    if (Plugins.TextToSpeech) {
      const o = { text, lang: ma, rate: nhip };
      if (t.pitch != null) o.pitch = t.pitch;
      await Plugins.TextToSpeech.speak(o); return;
    }
  } catch (e) { /* thử fallback */ }
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = ma; u.rate = nhip;
    if (t.pitch != null) u.pitch = t.pitch;
    // Chọn giọng bằng CoVu.giongTot chứ không lấy giọng đầu danh sách: thứ tự
    // mặc định hay trả về giọng nén nhỏ, nghe rất "robot".
    const ds = speechSynthesis.getVoices();
    const v = (window.CoVu && window.CoVu.giongTot(ma.slice(0, 2), ds))
      || ds.find((x) => x.lang && x.lang.startsWith(ma.slice(0, 2)));
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
/* ==================================================================== */
/* Ghi âm để đọc theo                                                    */
/* ==================================================================== */

/**
 * Cụm nút ghi âm cho MỘT mục: Ghi · Nghe · Xoá.
 *
 * Đọc theo không phải việc làm một lần. Người ta nghe câu mẫu, đọc lại, nghe
 * lại giọng mình, thấy chỗ vấp, rồi XOÁ ĐI ĐỌC LẠI cho tới lúc vừa ý — nên ba
 * việc ấy phải nằm cạnh nhau, không chôn cái nào vào menu. Ghi lại đè thẳng lên
 * bản cũ, đúng như người ta nghĩ khi bấm "Ghi lại".
 *
 * Mã bản thu là KHOÁ CỦA MỤC, nên sổ tay và buổi học nhìn thấy cùng một bản thu.
 *
 * @param {string} ma khoá của mục
 */
function cumGhiAm(ma, giuLau, mocSua) {
  const cum = el("span", "ghiam");
  let dangThu = null;

  const ve = async () => {
    cum.textContent = "";
    if (!window.GhiAm || !window.GhiAm.hoTro()) return;   // máy không ghi âm được thì đừng bày nút ra

    if (dangThu) {
      const b = nutIcon("stop", T("Dừng ghi"), "dangthu", 17);
      b.addEventListener("click", async (e) => {
        e.stopPropagation();
        const t = dangThu; dangThu = null;
        try {
          // Nhìn KẾT QUẢ ghi, đừng chỉ nhìn việc gọi xong. Bản thu giờ không bị
          // cắt ngắn nữa nên có thể rất nặng, và kho vẫn có thể chối. Thu mười
          // phút rồi báo "đã ghi" trong khi chẳng có gì được lưu là kiểu mất mát
          // tệ nhất — thà nói thẳng để người ta thu lại ngắn hơn.
          const xong = await window.GhiAm.luu(ma, await t.dung(), giuLau);
          toast(xong ? T("Đã ghi xong — bấm Nghe để nghe lại.")
                     : T("Không lưu được bản thu — có lẽ máy đã hết chỗ."), xong ? "" : "bad");
        } catch (err) { toast(T("Không ghi được: ") + ((err && err.message) || err), "bad"); }
        ve();
      });
      cum.appendChild(b);
      return;
    }

    const ban = await window.GhiAm.doc(ma);
    const thu = nutIcon("microphone", ban ? T("Ghi lại — đè lên bản cũ") : T("Ghi giọng mình để đọc theo"), "", 17);
    thu.addEventListener("click", async (e) => {
      e.stopPropagation();
      // Tắt tiếng đang phát TRƯỚC khi bật micro: không thì máy thu lại chính
      // giọng nó vừa phát ra, và bản thu mới lẫn hai giọng.
      window.GhiAm.dungPhat();
      try { dangThu = await window.GhiAm.batDau(); ve(); }
      catch (err) {
        const x = window.GhiAm.loiMicro(err);
        toast(T(x.loi) + (x.ten ? " (" + x.ten + ")" : ""), "bad");
      }
    });

    if (ban) {
      // Đang phát chính bản này thì nút đổi thành DỪNG — nhìn ra ngay là đang
      // chạy, và bấm lần nữa là dừng chứ không chồng thêm một giọng nữa.
      const dangNghe = window.GhiAm.maDangPhat() === ma;
      // Chữ đã sửa sau khi thu thì bản thu này là của chữ CŨ. Không xoá hộ —
      // đây là bản giữ lâu dài — nhưng phải nói ra, chứ để họ so giọng với một
      // đoạn không còn tồn tại thì vô nghĩa.
      const cu = mocSua && ban.ts && ban.ts < mocSua;
      const nghe = nutIcon(dangNghe ? "stop" : "play",
        dangNghe ? T("Dừng phát")
                 : (cu ? T("Nghe lại — bản thu này thu TRƯỚC lần sửa, chữ đã khác")
                       : T("Nghe lại giọng mình")),
        (dangNghe ? "dangphat" : "") + (cu ? " thucu" : ""), 16);
      nghe.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (window.GhiAm.maDangPhat() === ma) { window.GhiAm.dungPhat(); ve(); return; }
        // Lấy tiếng nói đúng lúc sắp phát — lúc vẽ chỉ có phần mô tả.
        const day = await window.GhiAm.docBan(ma);
        if (!day || !window.GhiAm.phat(ma, day, ve)) toast(T("Không phát được bản thu."), "bad");
        ve();
      });
      cum.appendChild(nghe);
      cum.appendChild(thu);
      const bo = nutIcon("trash", T("Xoá bản thu này"), "", 16);
      bo.addEventListener("click", async (e) => { e.stopPropagation(); await window.GhiAm.xoa(ma); ve(); });
      cum.appendChild(bo);
    } else {
      cum.appendChild(thu);
    }
  };

  ve();
  return cum;
}

/**
 * @param {{chu:string, lam:Function}} [hanhDong] nút ngay trong lời nhắc.
 *
 *   Dùng cho việc XOÁ ĐƯỢC HOÀN TÁC. Hỏi "bạn chắc chứ?" trước mỗi lần bỏ một
 *   từ liên kết thì việc nào cũng mất hai lượt bấm, mà người ta bỏ hàng chục
 *   từ một lúc. Cho bấm ngay rồi chừa đường lui thì nhanh mà vẫn không mất gì.
 */
function toast(chu, kieu, hanhDong) {
  const t = $("toast");
  t.className = "toast" + (kieu ? " " + kieu : "");
  t.innerHTML = window.Icon(kieu === "bad" ? "warning-circle" : "check-circle", { size: 18, weight: "solid" });
  t.appendChild(el("span", null, chu));
  if (hanhDong && hanhDong.lam) {
    const b = el("button", "toast-nut", hanhDong.chu || T("Hoàn tác"));
    b.type = "button";
    b.addEventListener("click", () => {
      t.classList.remove("show");
      clearTimeout(toastTimer);
      hanhDong.lam();
    });
    t.appendChild(b);
  }
  t.classList.add("show");
  clearTimeout(toastTimer);
  // Có nút thì để lâu hơn: 3,6 giây vừa đủ ĐỌC, chưa đủ để quyết định rồi bấm.
  toastTimer = setTimeout(() => t.classList.remove("show"), hanhDong ? 6500 : 3600);
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
/**
 * Mục này có ĐƯỜNG nào đang tới hạn không.
 *
 * Hỏi thẳng bộ não đa-đường (srs.js) chứ không tự đọc `srs.due`: từ khi một mục
 * có bốn đường, `srs` chỉ còn là bản gộp, mà con số trên nút "Học ngay" phải
 * khớp với hàng đợi thật — lệch nhau thì nút báo 5 mục mà mở ra 8 thẻ.
 */
function isDue(it, now) {
  if (it.del) return false;
  return window.Srs.denHan(it, now || Date.now()).length > 0;
}

/**
 * Nhịp bấm của CHÍNH người học, riêng cho từng đường. Để ở đây chứ không nhét
 * vào từng mục: đây là thống kê về TAY người dùng (ngón cái trên điện thoại
 * chậm hơn chuột cả giây), không phải thuộc tính của từ — mà một từ chỉ ôn dăm
 * lần thì không bao giờ đủ mẫu.
 */
let nhipMs = null;
async function docNhipMs() {
  if (nhipMs) return nhipMs;
  nhipMs = (await Store.get("nhipMs")) || {};
  return nhipMs;
}

/**
 * Chấm một lượt ôn.
 * @param {number} [ms] thời gian truy xuất, đo từ lúc hiện thẻ tới lúc bấm
 * @param {string} [duong] đường nào đang được kiểm; mặc định "nhin"
 */
/**
 * @param {number} [chat] 0..1 — làm đúng được mấy phần, cho những bài chấm theo
 *   phần (hai bài liên kết). Bỏ trống thì chỉ có nhớ/quên, xem Srs.heChatLuong.
 */
/*
 * Mọi thẻ vào đây đều là thẻ ĐÃ TỚI HẠN, nên chấm như nhau — không còn ngoại lệ.
 *
 * Từng có một tham số `som` cho thẻ bị kéo vào vì cùng cụm với một từ tới hạn:
 * nhớ thì không xếp lịch lại, quên thì vẫn phạt. Bất đối xứng ấy có chủ ý,
 * nhưng đo ra thì nó chỉ có thể làm hại — 180 ngày, sổ 600 từ: tốn thêm 14,8%
 * số thẻ để MẤT 3,6 điểm. Nay `hangDoiKhoi` chỉ kéo bạn ĐÃ tới hạn, nên thẻ
 * loại ấy không còn tồn tại và tham số cũng đi theo.
 */
async function gradeWord(key, remembered, ms, duong, chat) {
  const d = duong || "nhin";
  const tkAll = await docNhipMs();
  /*
   * Bảng đếm thẻ theo ngày, để Srs.cham né được ngày đã đông.
   *
   * Dựng lại ở TỪNG lượt chấm: một buổi có thể chấm cả trăm thẻ, mà mỗi lượt
   * lại hẹn thêm một ngày mới. Giữ một bản cho cả buổi thì cả trăm thẻ ấy cùng
   * nhìn một tấm lịch đã lỗi và cùng dồn vào đúng cái ngày mà tấm lịch tưởng
   * là vắng — đúng hiện tượng đang đi chữa.
   */
  const lich = window.Srs.lichHen(Object.values(await getNB()));
  let kq = null;
  await capNhat((nb) => {
    const e = nb[key]; if (!e) return;
    const cu = (e.duong && e.duong[d]) || null;
    // Mục cũ chưa có `duong`: lấy `srs` cũ làm điểm xuất phát cho đường "nhin",
    // để một sổ tay đang dùng dở không bị đá về cấp 0 hết.
    const batDau = cu || (d === "nhin" && e.srs ? { lv: e.srs.lv } : null);
    kq = window.Srs.cham(batDau, remembered, ms || 0, tkAll[d], Date.now(), d, Math.random(),
                         chat, lich);
    // Ôn kèm mà NHỚ: giữ nguyên lịch, chỉ lấy phần thống kê nhịp bấm.
    const moi = Object.assign({}, e);
    moi.duong = Object.assign({}, e.duong || {}, { [d]: kq.duong });
    // `srs` vẫn được ghi, và vẫn là thứ đồng bộ Drive / bản extension / máy chủ
    // MCP đọc. Nó là bản GỘP của các đường — xem Srs.gomSrs.
    moi.srs = window.Srs.gomSrs(moi) || { lv: -1, due: Date.now(), ts: Date.now() };
    moi.ts = Date.now();
    nb[key] = moi;
  });
  if (kq) { nhipMs[d] = kq.tk; await Store.set("nhipMs", nhipMs); }
  return kq;
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

/* -------------------------------------------------------------------- */
/* Thang 100 điểm                                                        */
/* -------------------------------------------------------------------- */
/*
 * Vì sao chip trên thẻ thôi hiện "Cấp N".
 *
 * "Cấp" đọc từ `srs.lv`, mà `srs` là bản GỘP lấy cấp của đường YẾU NHẤT. Đo
 * trên 600 từ sau 180 ngày: 344 từ (57%) hiện cấp 0 trong khi đường nhìn của
 * chúng trung bình đã cấp 5. Người học nhìn một từ mình nhận ra tức khắc và
 * thấy "Cấp 1" — không ai học tiếp với cái đó.
 *
 * Thang 100 điểm cộng cả bốn đường lại có trọng số, nên công bỏ vào đường nào
 * cũng hiện ra. Còn việc "đã chứng minh được tới đâu" thì do NHÃN nói, và nhãn
 * có cổng riêng — xem Srs.diemTu.
 */

/** Đường không có dữ liệu thì nói rõ vì sao, đừng để trống cho người ta đoán. */
function coSaoThieu(duong) {
  if (duong === "nghe") return T("chưa có câu nguồn");
  if (duong === "dong") return T("chưa tìm được từ đồng nghĩa");
  if (duong === "trai") return T("chưa tìm được từ trái nghĩa");
  return T("chưa có dữ liệu");
}

/** Một dòng gọn cho chip: "72 · Nghe ra". */
function chuDiem(it) {
  const d = window.Srs.diemTu(it);
  return d.tong + " · " + T(d.ten);
}

/**
 * Bốn dòng chi tiết — dùng chung cho tooltip của chip và cho khung bấm vào.
 * @returns {Array<{duong,ten,diem,trangThai,co,han}>}
 */
function dongDiem(it, now) {
  const nay = now || Date.now();
  const d = window.Srs.diemTu(it);
  const han = window.Srs.denHan(it, nay);
  const mo = window.Srs.duongMo(it);
  return window.Srs.DUONG.map((t) => {
    const x = (it.duong || {})[t];
    const co = d.phan[t] !== null;
    let trangThai;
    if (!co) trangThai = coSaoThieu(t);
    else if (mo.indexOf(t) < 0) trangThai = T("chưa mở");
    else if (han.indexOf(t) >= 0) trangThai = T("đến hạn");
    else trangThai = khiNaoOn(x && x.due, nay);
    return { duong: t, ten: T(window.Srs.TEN_DUONG[t]), diem: d.phan[t],
             trangThai: trangThai, co: co, han: co && han.indexOf(t) >= 0 };
  });
}

/** Bảng chi tiết dạng chữ, cho thuộc tính `title`. */
function chuBangDiem(it, now) {
  const d = window.Srs.diemTu(it);
  const dong = dongDiem(it, now).map((r) =>
    "· " + r.ten + ": " + (r.co ? r.diem + "/100 — " : "") + r.trangThai);
  const dau = T2("{d}/100 · {b}", { d: d.tong, b: T(d.ten) });
  const cuoi = d.chuaDo.length
    ? "\n" + T2("Chưa đo được: {ds}", { ds: d.chuaDo.map((x) => T(x)).join(", ") })
    : "";
  return dau + "\n" + dong.join("\n") + cuoi + "\n" + T("Bấm để ôn các bài còn lại.");
}

/**
 * Chip điểm: vừa là con số, vừa là thanh tiến độ, vừa là nút.
 *
 * Nền chip là một gradient dừng ở đúng số điểm — không thêm phần tử nào, không
 * đổi bố cục, mà liếc một cái đã thấy được tiến độ trước khi kịp đọc con số.
 */
function chipDiem(it, now) {
  const d = window.Srs.diemTu(it);
  const den = isDue(it, now);
  const b = el("button", "tag srs diem" + (den ? " due" : ""));
  b.type = "button";
  b.style.setProperty("--diem", d.tong + "%");
  b.appendChild(ic(den ? "alarm" : "target", { size: 12 }));
  b.appendChild(el("span", null, chuDiem(it)));
  b.title = chuBangDiem(it, now);
  b.setAttribute("aria-label", T2("Điểm {d} trên 100, mức {b}. Bấm để ôn các bài còn lại.",
                                  { d: d.tong, b: T(d.ten) }));
  b.addEventListener("click", (e) => { e.stopPropagation(); moBangDiem(it); });
  return b;
}

/**
 * Lời báo sau một lượt chấm: "Nhớ → 72/100 (+5) · Nghe câu → nghĩa: còn 14 ngày".
 *
 * Đây là chỗ DUY NHẤT người học thấy con số đang NHÍCH LÊN — chip trên thẻ chỉ
 * cho thấy nó đứng ở đâu. Nên phần chênh lệch phải có: một con số đứng một mình
 * không nói được là lượt vừa rồi có ăn thua gì không.
 *
 * Nói luôn hạn của ĐÚNG đường vừa chấm chứ không phải hạn gộp, vì từ nay mỗi
 * đường một lịch riêng — báo hạn gộp thì người ta tưởng cả từ đã hẹn xa như thế.
 */
function chuBaoCham(nho, truoc, mucSau, duong) {
  const dau = nho ? T("Nhớ") : T("Quên");
  if (!mucSau) return dau;
  const d = window.Srs.diemTu(mucSau);
  const chenh = d.tong - (typeof truoc === "number" ? truoc : d.tong);
  const dc = chenh > 0 ? " (+" + chenh + ")" : (chenh < 0 ? " (" + chenh + ")" : "");
  const x = (mucSau.duong || {})[duong];
  return dau + " → " + d.tong + "/100" + dc + " · " +
         T(window.Srs.TEN_DUONG[duong] || duong) + ": " + khiNaoOn(x && x.due, Date.now());
}

/** Từ đang mở bảng điểm — giữ lại để nút "Ôn bài còn lại" biết ôn từ nào. */
let diemDangXem = null;

/**
 * Những đường nên đem ra ôn khi bấm "Ôn bài còn lại".
 *
 * Chỉ nhận đường CHƯA THỬ và đường ĐẾN HẠN. Hai lý do:
 *
 *   - Đó là chỗ có nhiều dư địa nhất. Một đường chưa thử đáng 0 điểm; làm đúng
 *     một lượt là nó lên ngay ~12 điểm của đường ấy, và tổng nhích lên thấy rõ.
 *
 *   - Cho ôn cả đường CHƯA đến hạn thì con số cày được bằng cách bấm liên tục,
 *     và nó thôi không còn là một phép đo trí nhớ nữa. Đường chưa tới hạn vẫn
 *     hiện trong bảng, chỉ là không đem ra hỏi.
 *
 * Đường chưa mở (Srs.duongMo) cũng không nhận: hỏi từ đồng nghĩa của một từ vừa
 * nhìn thấy đúng một lần là làm khó chứ không phải dạy.
 */
function duongOnDuoc(it, now) {
  /*
   * ĐÓNG BĂNG PHẢI CHẶN Ở ĐÂY NỮA, không chỉ ở `denHan`.
   *
   * Hàm này cố tình cho qua cả đường CHƯA HỌC BAO GIỜ (`ngayCua === 0`), vì một
   * đường vừa mở thì chưa có `due` để mà tới hạn. Nghĩa là `denHan` rỗng VẪN
   * KHÔNG đủ để nó trả về rỗng, và nút "Ôn bài còn lại" trong bảng điểm vẫn
   * mọc lên trên một từ đã đóng băng.
   */
  if (it && it.dongBang) return [];
  const nay = now || Date.now();
  const mo = window.Srs.duongMo(it);
  const han = window.Srs.denHan(it, nay);
  return window.Srs.duongCo(it).filter((t) =>
    mo.indexOf(t) >= 0 && (han.indexOf(t) >= 0 || window.Srs.ngayCua((it.duong || {})[t]) === 0));
}

function moBangDiem(it) {
  const now = Date.now();
  diemDangXem = it;
  const d = window.Srs.diemTu(it);
  $("dsTu").textContent = it.word;
  $("dsTong").textContent = T2("{d}/100 · {b}", { d: d.tong, b: T(d.ten) });

  const khung = $("dsBang");
  khung.textContent = "";
  for (const r of dongDiem(it, now)) {
    const dong = el("div", "diem-dong" + (r.co ? "" : " thieu") + (r.han ? " den" : ""));
    dong.appendChild(el("span", "diem-ten", r.ten));
    const thanh = el("span", "diem-thanh");
    if (r.co) thanh.style.setProperty("--diem", r.diem + "%");
    dong.appendChild(thanh);
    dong.appendChild(el("span", "diem-so", r.co ? String(r.diem) : "—"));
    dong.appendChild(el("span", "diem-khi", r.trangThai));
    khung.appendChild(dong);
  }

  /*
   * Những từ CÙNG CỤM đã có trong sổ — xem ghi chú bên bản extension. Đây cũng
   * là chỗ nói rõ ranh giới: ôn KÈM NHAU, còn điểm thì ai nấy giữ.
   */
  {
    const o = $("dsCum");
    if (o) {
      o.textContent = "";
      const ban = window.TuLien.cumCua(it, window.TuLien.chiMucLien(mucDaLuu))
        .map((k) => mucDaLuu.find((x) => x.key === k))
        .filter(Boolean);
      if (ban.length) {
        o.appendChild(el("span", "diem-cum-nhan", T("Cùng cụm:")));
        for (const b of ban) {
          const n = el("button", "chip nho", b.word + " " + window.Srs.diemTu(b).tong);
          n.type = "button";
          n.title = T("Ôn kèm cùng nhau; điểm thì mỗi từ giữ riêng.");
          n.addEventListener("click", () => moBangDiem(b));
          o.appendChild(n);
        }
      }
    }
  }

  // Nói thẳng chiều nào chưa đo được, để cái nhãn kia không bị đọc thành một
  // lời hứa rộng hơn những gì thật sự đã chứng minh.
  $("dsChuaDo").textContent = d.mangTat
    ? T("Mạng nghĩa: bạn đã tắt cho từ này — nhãn ở trên không tính phần đó.")
    : (d.chuaDo.length
      ? T2("Chưa đo được: {ds} — nhãn ở trên chỉ nói tới phần đã đo.",
           { ds: d.chuaDo.map((x) => T(x)).join(", ") })
      : "");

  const on = duongOnDuoc(it, now);
  $("dsOn").disabled = !on.length;
  // "Chưa bài nào tới hạn" là sai sự thật với từ đóng băng — nó không chờ tới
  // hạn, nó đã được rút ra. Nói đúng thì người ta còn biết phải đi gỡ băng.
  $("dsOn").textContent = on.length
    ? T2("Ôn {n} bài còn lại", { n: on.length })
    : (it.dongBang ? T("Từ này đang đóng băng") : T("Chưa bài nào tới hạn"));
  $("diemSheet").classList.add("show");
}

function dongBangDiem() {
  $("diemSheet").classList.remove("show");
  diemDangXem = null;
}

$("dsThoat").addEventListener("click", dongBangDiem);
$("diemSheet").addEventListener("click", (e) => { if (e.target === $("diemSheet")) dongBangDiem(); });
$("dsOn").addEventListener("click", async () => {
  const it = diemDangXem;
  if (!it) return;
  const ds = duongOnDuoc(it, Date.now());
  dongBangDiem();
  if (ds.length) await hocRieng(it, ds);
});

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
    /*
     * Free Dictionary trả về CẢ trái nghĩa, và bài liên kết cần nó.
     *
     * Bản extension đã sửa chỗ này khi làm bài trái nghĩa; bản Android là bản
     * chép tay của cùng hàm và lượt sửa ấy không chép sang. Hậu quả đo được:
     * mục tiếng Anh trên Android không bao giờ có `lien.trai`, nên bài TRÁI
     * NGHĨA không bao giờ mở — người học tiếng Anh mất hẳn một trong bốn đường
     * mà không có gì báo. Tiếng Nhật không dính vì nó lấy trái nghĩa từ bảng
     * hạt giống và 日本語WordNet nằm sẵn trong máy, không qua hàm này.
     */
    const ant = (m.antonyms || []).slice(0, 6);
    if (defs.length || syn.length || ant.length) out.push({ p: m.partOfSpeech || "", defs, syn, ant });
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

const rubyDem = new Map();

/**
 * Furigana cho CẢ CÂU: đặt trên từng khúc chữ Hán, không phải một dòng kana
 * chạy dài ở dưới — dòng đó đọc còn mệt hơn đọc chữ Hán.
 *
 * Xin được từ Google chỉ là kana của cả câu, nên phần còn lại là canh: chỗ kana
 * đã có sẵn trong câu chính là các cọc mốc. Canh không khớp thì trả về rỗng —
 * furigana đặt sai chỗ còn tệ hơn không có. Xem kana.js.
 */
async function rubyCua(text) {
  const w = (text || "").trim();
  if (!w || !hasJapanese(w)) return [];
  if (rubyDem.has(w)) return rubyDem.get(w);
  let ra = [];
  try {
    const kana = window.Kana.tuRomajiCum(await romajiCua(w));
    ra = kana ? window.Kana.gonRuby(window.Kana.ghepFurigana(w, kana)) : [];
  } catch (e) { ra = []; }
  if (rubyDem.size > 400) rubyDem.clear();
  rubyDem.set(w, ra);
  return ra;
}

/**
 * Ghép furigana cho một mục ĐÃ nằm trong sổ, rồi vá tại chỗ.
 *
 * Chạy SAU khi đã ghi và KHÔNG chờ: bấm Lưu thì phải lưu xong ngay. Bắt cả lượt
 * lưu đứng chờ một lượt hỏi mạng chỉ để làm đẹp cách đọc là đổi một thứ chắc
 * chắn lấy một thứ hên xui — mạng chậm thì nút treo, mạng hỏng thì mất luôn cảm
 * giác "đã lưu". Mốc `ts` của mục cũng không bị đụng tới — đây là máy tự vá,
 * không phải bạn vừa sửa, nên nó không được kéo cả sổ lên cloud.
 */
async function rubyVaSau(key, word) {
  try {
    const rb = await rubyCua(word);
    if (!rb.length) return;
    await capNhat((nb) => {
      const it = nb[key];
      if (!it || it.del || window.Kana.rubyKhop(it.word, it.ruby)) return;
      it.ruby = rb;
      it.docSuy = 1;
    });
  } catch (e) { /* không ghép được thì thôi, mục vẫn dùng bình thường */ }
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
  const doi = {}, doiRuby = {};
  for (const k of Object.keys(nb)) {
    const it = nb[k];
    if (!it || it.del) continue;
    // Thẻ chữ Hán cũng là mục tiếng Nhật. Bỏ sót nhóm này là cả một loại thẻ
    // nằm trong sổ mà không bao giờ có cách đọc — đúng thứ cần furigana nhất.
    if (it.dict !== "javi" && it.dict !== "vija" && it.dict !== "kanji") continue;
    // CHÚ Ý: không bỏ qua mục đã có kana ở đây. Cách đọc thì đã xong, nhưng
    // furigana của nó vẫn có thể lệch (ruby cũ suy từ romaji Google) — phải để
    // lọt xuống dưới mà soát lại. Việc soát là ghép chuỗi thuần, không tốn mạng.

    // Cả câu (và cụm dài quá mức để có MỘT dòng kana) đi đường khác: furigana
    // đặt trên từng khúc chữ Hán. Trước đây nhánh này bị bỏ qua thẳng, nên câu
    // lưu trong sổ tay của bản Android không bao giờ có furigana.
    const coHan = window.Kana.catKhuc(it.word).some((x) => x.han);
    if (it.kind === "sent" || (coHan && !window.Kana.canDoc(it.word, ""))) {
      if (!coHan) continue;                        // toàn kana: chẳng có gì để đặt furigana lên
      // "Đã ghép rồi" chưa đủ: bảng cũ bám theo từng khúc chữ Hán, sửa lại chữ
      // của mục là nó hết khớp và ruby lặng lẽ biến mất. Hỏi xem còn khớp không
      // thì mục ấy được ghép lại, thay vì mất furigana vĩnh viễn.
      if (window.Kana.rubyKhop(it.word, it.ruby)) continue;
      if (conMang <= 0) continue;                  // để dành cho lượt mở sau
      const rb = await rubyCua(it.word);
      conMang--;                                   // trừ cả lượt hỏi hụt
      if (rb.length) doiRuby[k] = { rb: rb, suy: true };   // ruby cả câu suy từ Google
      continue;
    }

    // Cách đọc: có phải đi hỏi mạng không — chỉ khi trắng cách đọc và có chữ
    // Hán. Hết lượt mạng thì để lần mở sau, NHƯNG vẫn soát ruby ở dưới.
    const phaiHoi = !it.reading && window.Kana.canDoc(it.word, "");
    if (!(phaiHoi && conMang <= 0)) {
      const r = await docKana(it.word, it.reading, phaiHoi);
      if (phaiHoi) conMang--;
      if (r && r.doc && r.doc !== it.reading) doi[k] = r;
    }

    // Furigana của TỪ ĐƠN suy TỪ CHÍNH cách đọc của mục — không hỏi Google lần
    // nữa. Đây là chỗ chữa lỗi "furigana lệch với phiên âm": trước đây ruby đi
    // qua romaji của Google, một nguồn TÁCH khỏi cách đọc từ điển đã cho, nên
    // có ngày lệch — 発売 phiên âm はつばい mà furigana lại ra わっぱい. Một
    // nguồn thì không tự lệch với mình. Ghép lại rẻ (chuỗi thuần), chỉ ghi khi
    // khác thật để cloud khỏi tưởng cả sổ vừa đổi; ghép hụt thì GIỮ ruby cũ.
    const docChot = (doi[k] && doi[k].doc) || it.reading || "";
    if (docChot && !window.Kana.laRomaji(docChot) && window.Kana.canDoc(it.word, "")) {
      // MỘT cách đọc thôi: từ điển hay trả "せい/しょう/なま" trong một chuỗi, mà
      // nhét cả cụm lên đỉnh chữ thì furigana dài gấp mấy lần chữ nó chú.
      // canDoc() ở trên đã chốt đây là TỪ ĐƠN (≤12 chữ) nên cắt được an toàn.
      const docMot = window.Kana.motCachDoc(docChot);
      const rb2 = window.Kana.gonRuby(window.Kana.ghepFurigana(it.word, docMot));
      if (rb2.length && rb2.join("\u241f") !== ((it.ruby || []).join("\u241f"))) {
        const suy = !!(doi[k] && doi[k].suy) || !!it.docSuy;
        doiRuby[k] = { rb: rb2, suy: suy };
      }
    }
  }
  const keys = Object.keys(doi), keysRb = Object.keys(doiRuby);
  if (!keys.length && !keysRb.length) return 0;
  await capNhat((moi) => {
    for (const k of keys) {
      const it = moi[k];
      if (!it || it.del) continue;
      it.reading = doi[k].doc;
      if (doi[k].suy) it.docSuy = 1;
    }
    for (const k of keysRb) {
      const it = moi[k];
      if (!it || it.del) continue;
      it.ruby = doiRuby[k].rb;
      if (doiRuby[k].suy) it.docSuy = 1;   // ruby chuẩn từ từ điển thì không gạch "suy ra"
    }
  });
  return keys.length + keysRb.length;
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
    if (dict === "vija") {
      /*
       * Việt -> Nhật. Dịch sang tiếng Nhật rồi TRA LẠI chính từ ấy bằng Mazii.
       *
       * Vì sao phải tra lại thay vì trả thẳng bản dịch: một từ tiếng Nhật trơ
       * gần như luôn là chữ Hán, mà chữ Hán không có cách đọc thì người học
       * không đọc lên được — tức là không dùng được để nói, đúng thứ họ cần.
       */
      let gv = null;
      try { gv = await gtxDict(w, "vi", "ja"); } catch (e) { gv = null; }
      const ja = gv ? gv.main : "";
      if (!ja) { lastLookupError = T("Chưa dịch được sang tiếng Nhật (kiểm tra mạng)."); return []; }
      const ds = await fetchMazii(ja).catch(() => []);
      const trung = ds.find((x) => x.word === ja);
      const entry = { word: ja, reading: trung ? trung.reading : "", means: [w], dict: "vija" };
      if (!entry.reading) {
        // Không tra được thì vẫn suy cách đọc, còn hơn để một dãy chữ Hán câm.
        try {
          const r = await docKana(ja, "", true);
          if (r) { entry.reading = r.doc; if (r.suy) entry.docSuy = 1; }
        } catch (e) { /* thôi vậy */ }
      }
      // Mấy cách nói khác cho cùng một ý — chọn được sắc thái thì câu mới tự nhiên.
      const khac = ds.filter((x) => x.word && x.word !== ja).slice(0, 5);
      return [entry].concat(khac.map((x) => Object.assign({}, x, { dict: "vija" })));
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
  // KHO CHUNG trước: khai rồi thì mọi ngôn ngữ đi chung một máy chủ, và cờ
  // `chung` báo cho doSync biết thôi lọc theo ngôn ngữ. Xem KHOA_CHUNG/ngu.js.
  const c = (await Store.get("syncChung")) || {};
  if (c.url) return { url: c.url, token: c.token || "", chung: true };
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
  let remoteNb, remoteDecks, remoteHoc, remoteNoi, remoteDo, remoteSua;
  if (data && typeof data === "object" && data.notebook !== undefined) {
    remoteNb = data.notebook || {}; remoteDecks = data.decks || {}; remoteHoc = data.hoc || null;
    remoteNoi = data.luyenNoi || {}; remoteDo = data.soDoSrs || {};
    remoteSua = data.phuDeSua || {};
  } else {
    remoteNb = data || {}; remoteDecks = {}; remoteHoc = null;
    remoteNoi = {}; remoteDo = {}; remoteSua = {};
  }
  // Cloud cũ có thể lẫn khoá của ngôn ngữ khác; vẫn nhận về máy, nhưng khi gửi
  // lên thì lọc lại cho sạch.
  const dungChung = !!cfg.chung;
  const remoteCuaToi = dungChung ? remoteNb : window.Ngu.locSo(remoteNb, ngu);
  const mergedNb = mergeByTs(
    dungChung ? await getNB() : window.Ngu.locSo(await getNB(), ngu), remoteCuaToi);
  // Ảnh đính kèm KHÔNG đi lên Drive: byte nằm trong IndexedDB của từng máy, nên
  // bản mô tả gửi lên chỉ là con trỏ trỏ vào ổ đĩa máy này — sang máy khác nó
  // là con trỏ chết, hiện ra một ô ảnh trắng không ai giải thích được.
  const guiDi = boAnh(mergedNb);
  // Sổ con cũng tách theo ngôn ngữ, đúng như hồi còn là hai app.
  const nbTatCa = await getNB();
  const mergedDecks = dungChung
    ? mergeByTs(await getDecks(), remoteDecks)
    : mergeByTs(window.Ngu.locSoCon(await getDecks(), nbTatCa, ngu),
                window.Ngu.locSoCon(remoteDecks, remoteNb, ngu));
  // Tiến độ học trộn theo luật riêng — xem TienDo.tron().
  const hocTach = window.Ngu.tachHoc(await Store.get("hoc"));
  // Kho chung giữ CẢ HAI nhánh tiến độ trong một gói { ja, en }; gộp riêng từng
  // nhánh vì tron() làm việc trên một nhánh chứ không hiểu cái vỏ ngoài.
  let mergedHoc;
  if (dungChung) {
    const xa = window.Ngu.tachHoc(remoteHoc);
    mergedHoc = {};
    for (const n of window.Ngu.DS) mergedHoc[n] = window.TienDo.tron(hocTach[n], xa[n]);
  } else {
    mergedHoc = window.TienDo.tron(hocTach[ngu], remoteHoc);
  }

  /*
   * `luyenNoi` và `soDoSrs` PHẢI đi kèm, dù bản Android không tự ghi soDoSrs.
   *
   * Apps Script lưu NGUYÊN cả gói `data` rồi trả lại y như thế. Nên chỉ cần một
   * lượt đồng bộ từ máy này gửi gói thiếu hai khoá ấy là chúng bị xoá sạch khỏi
   * kho chung — kéo theo các đoạn Luyện nói người dùng tự gõ trên máy tính.
   * Gửi thiếu một khoá ở đây tai hại hơn hẳn việc không đọc nó.
   *
   * Hai phép gộp khác nhau: luyenNoi theo `ts` như sổ tay; soDoSrs là bảng đếm
   * cộng dồn nên mỗi máy một nhánh, xem Srs.tronSoDo.
   */
  const mergedNoi = window.Muc.tron((await Store.get("luyenNoi")) || {}, remoteNoi);
  const mergedDo = window.Srs.tronSoDo((await Store.get("soDoSrs")) || {}, remoteDo);
  /*
   * `phuDeSua` — bản Android KHÔNG có bảng lời thoại YouTube nên chẳng bao giờ
   * ghi khoá này. Nhưng vẫn phải CHUYỂN TIẾP nó: Apps Script lưu nguyên cả gói,
   * nên gửi gói thiếu khoá là xoá sạch những dòng người dùng đã sửa trên máy
   * tính. Gộp với kho rỗng của máy này thì bản trên cloud đi qua nguyên vẹn.
   */
  const mergedSua = window.Muc.tron((await Store.get("phuDeSua")) || {}, remoteSua);

  const save = await httpPostJson(cfg.url, {
    token: cfg.token || "", action: "save",
    data: { notebook: guiDi, decks: mergedDecks, hoc: mergedHoc,
            luyenNoi: mergedNoi, soDoSrs: mergedDo, phuDeSua: mergedSua }
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
  let finalHoc, finalHocNgu;
  if (dungChung) {
    finalHoc = Object.assign({}, freshHoc);
    for (const n of window.Ngu.DS) finalHoc[n] = window.TienDo.tron(freshHoc[n], (mergedHoc || {})[n]);
    finalHocNgu = finalHoc[ngu];
  } else {
    finalHocNgu = window.TienDo.tron(freshHoc[ngu], mergedHoc);
    finalHoc = Object.assign({}, freshHoc, { [ngu]: finalHocNgu });
  }
  // Đọc lại rồi mới gộp, y như sổ tay: có thể vừa thêm một đoạn nói lúc chờ mạng.
  const finalNoi = window.Muc.tron((await Store.get("luyenNoi")) || {}, mergedNoi);
  const finalDo = window.Srs.tronSoDo((await Store.get("soDoSrs")) || {}, mergedDo);
  const finalSua = window.Muc.tron((await Store.get("phuDeSua")) || {}, mergedSua);
  await Store.set("luyenNoi", finalNoi); await Store.set("soDoSrs", finalDo);
  await Store.set("phuDeSua", finalSua);
  await setDecks(finalDecks); await Store.set("hoc", finalHoc);
  theoDoi.dat(finalHocNgu);
  // So bản ĐÃ BỎ ẢNH với gói vừa gửi: so bản còn ảnh thì lần nào cũng khác nhau
  // và lượt đồng bộ này tự hẹn lượt sau, mãi mãi.
  if (JSON.stringify(boAnh(dungChung ? finalNb : window.Ngu.locSo(finalNb, ngu))) !== JSON.stringify(guiDi) ||
      JSON.stringify(dungChung ? finalHoc : finalHocNgu) !== JSON.stringify(mergedHoc)) syncSoon();

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

/* ==================================================================== */
/* Luyện nói                                                            */
/* ==================================================================== */
/*
 * Nghe rồi đọc theo từng câu là một chuyện; nói cả một đoạn của CHÍNH MÌNH lại
 * là chuyện khác — đó mới là lúc phải tự sắp ý, tự chọn chữ, và vấp ở đúng
 * những chỗ mình yếu. Trang này nhận một đoạn bất kỳ, dịch sang thứ tiếng kia,
 * rồi đặt hai bản cạnh nhau: mỗi bên một nút loa để nghe giọng máy, một cụm thu
 * để đọc lại, nghe hai giọng nối tiếp là ra ngay chỗ ngữ điệu lệch.
 *
 * Bản thu ở đây GIỮ LÂU DÀI, khác hẳn bản đọc theo ở sổ tay (một ngày là xoá).
 * Người ta lấy nó làm mốc để vài tuần sau nghe lại xem mình khá hơn chưa, nên
 * máy tự dọn là hỏng cả ý nghĩa. Chỉ chính họ xoá.
 */

/** Tên đọc được của từng thứ tiếng. Một chỗ, để nhãn ở mọi nơi giống nhau. */
const TEN_NGU = { vi: "Tiếng Việt", ja: "Tiếng Nhật", en: "Tiếng Anh" };

const HUONG_NOI = {
  en: [["envi", "Anh→Việt", "en", "vi"], ["vien", "Việt→Anh", "vi", "en"]],
  ja: [["javi", "Nhật→Việt", "ja", "vi"], ["vija", "Việt→Nhật", "vi", "ja"]],
};

async function docDoanNoi() { return (await Store.get("luyenNoi")) || {}; }
async function ghiDoanNoi(d) { await Store.set("luyenNoi", d); }

/** Mã bản thu của một mặt trong đoạn. Hai mặt thu riêng, nghe lại riêng. */
const maThuNoi = (id, mat) => "noi:" + id + ":" + mat;

function veHuongNoi() {
  const sel = $("spDir");
  if (!sel) return;
  const cu = sel.value;
  sel.innerHTML = "";
  (HUONG_NOI[NGU] || HUONG_NOI.en).forEach(([v, nhan]) => {
    const o = document.createElement("option");
    o.value = v; o.textContent = T(nhan);
    sel.appendChild(o);
  });
  if ([...sel.options].some((o) => o.value === cu)) sel.value = cu;
}

/**
 * Ô soạn thảo tại chỗ: đổi một khối chữ thành ô gõ, có Lưu và Huỷ.
 * Dùng chung cho cả tiêu đề lẫn hai mặt, nên ba chỗ ấy hành xử giống hệt nhau.
 */
function suaTaiCho(oCu, giaTri, motDong, luu) {
  const hop = el("div", "spedit");
  const o = document.createElement(motDong ? "input" : "textarea");
  if (motDong) o.type = "text"; else o.rows = Math.min(8, Math.max(3, Math.ceil(giaTri.length / 40)));
  o.className = "spedta";
  o.value = giaTri;
  hop.appendChild(o);

  const hang = el("div", "rowx");
  hang.style.cssText = "gap:6px;margin-top:6px";
  const bLuu = el("button", "btn sm primary");
  bLuu.type = "button"; bLuu.textContent = T("Lưu");
  const bHuy = el("button", "btn sm ghost");
  bHuy.type = "button"; bHuy.textContent = T("Huỷ");
  hang.appendChild(bLuu); hang.appendChild(bHuy);
  hop.appendChild(hang);

  const thoi = () => { hop.replaceWith(oCu); };
  bHuy.addEventListener("click", thoi);
  bLuu.addEventListener("click", async () => {
    const moi = o.value.trim();
    if (!moi || moi === giaTri) { thoi(); return; }
    bLuu.disabled = true; bLuu.textContent = T("Đang lưu…");
    await luu(moi);
  });
  o.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); thoi(); }
    if (e.key === "Enter" && (motDong || e.ctrlKey || e.metaKey)) { e.preventDefault(); bLuu.click(); }
  });

  oCu.replaceWith(hop);
  o.focus();
  try { o.setSelectionRange(o.value.length, o.value.length); } catch (e) { /* input kiểu khác */ }
}

/** Khoá hướng dịch cho một cặp thứ tiếng. */
function huongTu(tu, sang) {
  for (const ds of Object.values(HUONG_NOI)) {
    for (const [k, , a, b] of ds) if (a === tu && b === sang) return k;
  }
  return "";
}

/**
 * Sửa một mặt của đoạn, rồi DỊCH LẠI mặt kia cho khớp.
 *
 * Sửa xong mà để mặt kia y nguyên thì hai bản nói hai chuyện khác nhau — mà cả
 * trang này dựng lên chỉ để đặt hai bản cạnh nhau mà so.
 *
 * Dịch hụt thì VẪN LƯU chữ vừa sửa và nói thẳng là bản kia chưa kịp đổi — nuốt
 * mất đoạn người ta vừa gõ chỉ vì mạng chập là mất mát thật, còn hai bản lệch
 * nhau một lúc thì nhìn là thấy.
 */
async function suaMatDoan(id, mat, chuMoi) {
  const kho = await docDoanNoi();
  const x = kho[id];
  if (!x) return;
  const ngu = mat === "a" ? x.tuNgu : x.sangNgu;
  const nguKia = mat === "a" ? x.sangNgu : x.tuNgu;

  let dich = "";
  try {
    const h = huongTu(ngu, nguKia);
    if (h) { const r = await translateText(chuMoi, h); dich = (r && r.text) || ""; }
  } catch (e) { dich = ""; }

  if (mat === "a") { x.goc = chuMoi; if (dich) x.dich = dich; }
  else { x.dich = chuMoi; if (dich) x.goc = dich; }
  x.suaLuc = Date.now();
  await ghiDoanNoi(kho);
  if (!dich) toast(T("Đã lưu, nhưng chưa dịch lại được bản kia — kiểm tra mạng."), "bad");
  veLuyenNoi();
}

/** Một mặt của đoạn: chữ + nút loa + nút sửa + cụm ghi âm. */
function matDoan(x, mat) {
  const laGoc = mat === "a";
  const chu = laGoc ? x.goc : x.dich;
  const ngu = laGoc ? x.tuNgu : x.sangNgu;
  const nhan = TEN_NGU[ngu] ? T(TEN_NGU[ngu]) : ngu;

  const o = el("div", "spside");
  const dau = el("div", "sphead");
  dau.appendChild(el("span", "splb", nhan));

  const loa = nutIcon("speaker-high", T2("Nghe giọng máy đọc ({ngu})", { ngu: nhan }), "", 19);
  loa.addEventListener("click", () => speak(chu, "", ngu));
  dau.appendChild(loa);

  const sua = nutIcon("pencil-simple", T("Sửa đoạn này — bản kia sẽ tự dịch lại theo"), "", 18);
  dau.appendChild(sua);
  dau.appendChild(cumGhiAm(maThuNoi(x.id, mat), true, x.suaLuc));
  o.appendChild(dau);

  const oChu = el("div", "sptext" + (ngu === "ja" ? " ja" : ""), chu);
  o.appendChild(oChu);
  sua.addEventListener("click", () => {
    suaTaiCho(oChu, chu, false, (moi) => suaMatDoan(x.id, mat, moi));
  });
  return o;
}

async function veLuyenNoi() {
  const box = $("spList");
  if (!box) return;
  veHuongNoi();
  const kho = await docDoanNoi();
  // Chỉ đoạn của ngôn ngữ đang bật: đang học tiếng Nhật mà lẫn vào mấy đoạn
  // tiếng Anh thì trang này loãng ngay.
  const ds = Object.values(kho)
    .filter((x) => x && !x.del && (x.tuNgu === NGU || x.sangNgu === NGU))
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));

  $("speakCount").textContent = ds.length ? T2("{n} đoạn", { n: ds.length }) : "";
  box.innerHTML = "";
  if (!ds.length) {
    const d = el("div", "empty");
    d.appendChild(ic("microphone", { size: 40 }));
    d.appendChild(el("div", null, T("Chưa có đoạn nào. Viết một đoạn ở trên rồi bấm “Dịch và thêm”.")));
    box.appendChild(d);
    return;
  }

  for (const x of ds) {
    const the = el("div", "card spcard");

    /* Tên bài nói: để mấy chục bài còn phân ra được theo chủ đề. Chạm vào là
       sửa ngay tại chỗ — đặt tên thường là việc nghĩ lại sau khi đã viết xong. */
    const hangTen = el("div", "sptophead");
    const oTen = el("div", "sptitle" + (x.tieuDe ? "" : " trong"), x.tieuDe || T("(chưa đặt tên)"));
    hangTen.appendChild(oTen);
    const suaTen = nutIcon("pencil-simple", T("Đổi tên bài nói"), "", 16);
    suaTen.addEventListener("click", () => {
      suaTaiCho(oTen, x.tieuDe || "", true, async (moi) => {
        const k = await docDoanNoi();
        if (k[x.id]) { k[x.id].tieuDe = moi; await ghiDoanNoi(k); }
        veLuyenNoi();
      });
    });
    hangTen.appendChild(suaTen);
    the.appendChild(hangTen);

    the.appendChild(matDoan(x, "a"));
    the.appendChild(matDoan(x, "b"));

    const chan = el("div", "rowx");
    chan.style.cssText = "gap:8px;margin-top:10px;align-items:center";
    chan.appendChild(el("span", "t-tiny faint grow", new Date(x.suaLuc || x.ts).toLocaleDateString()));
    const xoa = el("button", "btn sm ghost danger");
    xoa.type = "button";
    xoa.appendChild(ic("trash", { size: 14 }));
    xoa.appendChild(el("span", "lb", T("Xoá đoạn")));
    xoa.addEventListener("click", async () => {
      if (!confirm(T("Xoá đoạn này và cả bản thu của nó?"))) return;
      const k = await docDoanNoi();
      delete k[x.id];
      await ghiDoanNoi(k);
      // Bản thu là bản GIỮ LÂU DÀI nên không ai dọn hộ — xoá đoạn thì phải dọn
      // theo, không thì nó nằm lại chiếm chỗ mà chẳng còn đường nào nghe tới.
      await window.GhiAm.xoa(maThuNoi(x.id, "a"));
      await window.GhiAm.xoa(maThuNoi(x.id, "b"));
      veLuyenNoi();
    });
    chan.appendChild(xoa);
    the.appendChild(chan);
    box.appendChild(the);
  }
}

async function themDoanNoi() {
  const oChu = $("spText"), nut = $("spAdd"), bao = $("spStatus");
  const chu = (oChu.value || "").trim();
  if (!chu) { bao.textContent = T("Hãy viết hoặc dán một đoạn đã."); return; }

  const mo = (HUONG_NOI[NGU] || HUONG_NOI.en).find((x) => x[0] === $("spDir").value);
  if (!mo) return;
  const [huong, , tuNgu, sangNgu] = mo;

  nut.disabled = true;
  bao.textContent = T("Đang dịch…");
  let ra = null;
  try { ra = await translateText(chu, huong); } catch (e) { ra = null; }
  nut.disabled = false;
  if (!ra || !ra.text) { bao.textContent = T("Chưa dịch được — kiểm tra mạng rồi thử lại."); return; }

  const id = "n_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const kho = await docDoanNoi();
  const oTen = $("spTitle");
  kho[id] = { id, tieuDe: (oTen && oTen.value.trim()) || "", goc: chu, dich: ra.text,
              tuNgu, sangNgu, ts: Date.now() };
  await ghiDoanNoi(kho);
  if (oTen) oTen.value = "";
  oChu.value = "";
  bao.textContent = "";
  veLuyenNoi();
}

const MAN = ["Lookup", "Notebook", "Study", "Speak", "Progress"];
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

  if (view !== "Study" && window.NhipDoc) window.NhipDoc.dung();
  if (view !== "Study" && window.NhacTau) window.NhacTau.tat();
  if (view !== "Study")  if (view === "Notebook") { drawNotebook(); pullAndRefresh(); }
  if (view === "Study") { updateDueButton(); pullAndRefresh(); }
  if (view === "Speak") veLuyenNoi();
  if (view === "Progress") { veTienDo(); pullAndRefresh(); }
}

MAN.forEach((v) => { $("nav" + v).addEventListener("click", () => show(v)); });
$("spAdd").addEventListener("click", themDoanNoi);

/** Vẽ lại icon thanh tab: tab đang mở dùng icon đặc. */
function veNav() {
  const bo = { Lookup: "magnifying-glass", Notebook: "notebook", Study: "graduation-cap",
               Speak: "microphone", Progress: "chart-line-up" };
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
  // Ảnh nằm trên cùng nên đóng trước tiên — nó mở được từ ngay trong phiếu sửa,
  // đóng phiếu trước thì ảnh vẫn phủ kín màn và người dùng vẫn kẹt.
  if (dongAnhXem()) return true;
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
/**
 * MẠNG NGHĨA của một mục: nó cùng nghĩa với những từ nào, ngược nghĩa với từ
 * nào. Trả về null nếu mục chưa được bồi tập liên kết.
 *
 * Bày ở CẢ HAI chỗ — danh sách sổ tay và mặt sau thẻ học — vì mạng nghĩa chỉ
 * đáng nhớ khi gặp đi gặp lại, chứ không phải chỉ lúc làm đúng bài kiểm tra về
 * nó. Đây là đường để vốn từ lan ra theo cụm thay vì từng từ rời rạc.
 *
 * Bấm một từ trong mạng: đã có trong sổ thì lọc sổ tay về đúng nó; chưa có thì
 * TRA nó — từ màn tra đã sẵn nút Lưu quen thuộc, không cần đẻ thêm đường lưu
 * thứ hai chỉ dùng ở một chỗ.
 *
 * @param {object} it mục sổ tay
 * @param {boolean} [gon] true = một dòng gọn cho danh sách sổ tay
 */
/*
 * Những từ ĐANG CÓ trong sổ, để mạng nghĩa biết từ nào bấm-để-xem và từ nào
 * bấm-để-tra.
 *
 * Phải là biến của cả tệp. Bản đầu tôi viết `items.some(...)` y như bên bản
 * extension — mà bên Android `items` chỉ là biến CỤC BỘ trong drawNotebook,
 * nên mặt sau thẻ học ném thẳng "items is not defined" và cả màn trắng. Bài
 * kiểm tra bắt được ở dòng "không có lỗi trang".
 */
let tuDaLuu = new Set();
/*
 * Bản chụp cả sổ (ngôn ngữ đang học) ở cấp module.
 *
 * Bên extension có sẵn biến `items` toàn cục; bên này `items` lại nằm trong
 * thân hàm vẽ danh sách, nên phiếu điểm không với tới được để dựng cụm. Giữ
 * thêm một bản chụp ngay cạnh `tuDaLuu`, cập nhật cùng lúc với nó.
 */
let mucDaLuu = [];

function khoiLien(it, gon) {
  const l = (it && it.lien) || {};
  const dong = (l.dong || []).filter(Boolean);
  const trai = (l.trai || []).filter(Boolean);
  if (!dong.length && !trai.length) return null;

  const hop = el("div", "lienmang" + (gon ? " gon" : ""));
  const hang = (nhan, ds, lop) => {
    if (!ds.length) return;
    const h = el("div", "lienmang-hang");
    h.appendChild(el("span", "lienmang-nhan " + lop, nhan));
    const o = el("span", "lienmang-ds");
    ds.forEach((chu) => {
      const oTu = el("span", "lienmang-o");
      const b = el("button", "lienmang-tu" + (NGU === "ja" ? " ja" : ""), chu);
      b.type = "button";
      const coSan = tuDaLuu.has(chu);
      if (coSan) b.classList.add("cosan");
      b.title = coSan ? T("Có trong sổ tay — bấm để xem") : T("Chưa có trong sổ — bấm để tra");
      b.addEventListener("click", (ev) => { ev.stopPropagation(); moTuLien(chu, coSan); });
      oTu.appendChild(b);
      // Nút BỎ, hiện sẵn: trên điện thoại không có chuột phải để giấu nó vào.
      const x = el("button", "lienmang-bo", "\u00d7");
      x.type = "button";
      x.title = T2("Bỏ “{tu}” khỏi liên kết — sẽ không ra trong bài kiểm tra nữa", { tu: chu });
      x.addEventListener("click", (ev) => {
        ev.stopPropagation();
        /*
         * Gỡ khỏi màn hình NGAY, đừng đợi ghi xong rồi vẽ lại.
         *
         * Khối này còn hiện ở MẶT SAU THẺ HỌC, mà ở đó không có lượt vẽ lại
         * nào — vẽ lại danh sách sổ tay không đụng tới thẻ đang mở. Không gỡ
         * tay thì chữ vừa bỏ nằm nguyên đó tới khi sang thẻ khác, và người ta
         * tưởng nút không ăn.
         */
        const hangCha = oTu.parentElement;
        oTu.remove();
        if (hangCha && !hangCha.children.length && hangCha.parentElement) {
          hangCha.parentElement.remove();          // hết từ thì bỏ luôn cả nhãn
        }
        boTuLien(it, chu);
      });
      oTu.appendChild(x);
      o.appendChild(oTu);
    });
    h.appendChild(o);
    hop.appendChild(h);
  };
  hang(T("Cùng nghĩa"), dong, "dong");
  hang(T("Trái nghĩa"), trai, "trai");
  /*
   * Cờ bật thì VẪN VẼ ĐỦ danh sách, chỉ làm mờ và ghi một dòng. Ẩn luôn đi
   * thì mất hai thứ: nhìn lại xem mình đã tắt cái gì, và nút × để bỏ nốt mấy từ
   * vô lý — mà mấy từ ấy vẫn đang có việc với những từ khác.
   */
  if (it && it.mangTat) {
    hop.classList.add("tat");
    hop.appendChild(el("div", "lienmang-tat",
      T("Bài đồng/trái nghĩa đang tắt cho từ này — các từ vẫn dùng cho từ khác.")));
  }
  return hop;
}

/**
 * BỎ một từ khỏi tập liên kết của một mục — theo ý người học.
 *
 * Bỏ CẢ HAI CHIỀU. Cụm ôn kèm (`TuLien.cumCua`) nối hai chiều theo thiết kế:
 * A kể tên B thì hai từ đã cùng cụm, B có kể lại tên A hay không cũng vậy. Nên
 * chỉ gỡ một phía thì hai từ vẫn bị xếp cạnh nhau trong buổi học, và người học
 * vừa bảo "cái này vô lý" lại thấy nó ngay hôm sau.
 *
 * @param {(daBo:boolean)=>void} [khiDoi] báo cho chỗ gọi biết trạng thái vừa đổi.
 *   Màn kết quả bài liên kết cần nó: nó nằm trên lớp phủ, không được vẽ lại theo
 *   sổ tay, nên phải tự làm mờ hàng vừa bỏ — và tự sáng lại nếu người ta Hoàn tác.
 *
 * Ba thứ tắt theo, không cần làm gì thêm:
 *   - bài đồng/trái nghĩa dựng đề từ `lien`, nên từ ấy hết là ứng viên;
 *   - `Srs.duongCo` đòi `dong` có từ 2 từ và `trai` có từ 1 từ mới MỞ đường,
 *     nên bỏ tới mức dưới ngưỡng là cả bài kiểm tra ấy đóng lại;
 *   - `Srs.diemTu` chia lại trọng số trên đúng những đường đang mở, nên điểm
 *     cũng thôi tính phần ấy — đúng như bạn muốn.
 */
async function boTuLien(it, chu, khiDoi) {
  // Bên này `items` nằm trong thân hàm vẽ danh sách; bản chụp cấp module là
  // `mucDaLuu`. Chép thẳng `items` sang là ném "items is not defined".
  const kia = mucDaLuu.find((x) => !x.del && x.word === chu);
  const truoc = [];                       // ảnh chụp để hoàn tác
  await capNhat((nb) => {
    const cap = [[it.key, chu]];
    if (kia && kia.key !== it.key) cap.push([kia.key, it.word]);
    for (const [k, tu] of cap) {
      const e = nb[k];
      if (!e || e.del) continue;
      truoc.push({ key: k, lien: e.lien, lienBo: e.lienBo });
      nb[k] = Object.assign({}, e, window.TuLien.boLien(e, tu), { ts: Date.now() });
    }
  });
  drawNotebook();
  syncSoon();
  if (khiDoi) khiDoi(true);
  toast(T2("Đã bỏ “{tu}” khỏi liên kết", { tu: chu }), null, {
    chu: T("Hoàn tác"),
    lam: async () => {
      await capNhat((nb) => {
        for (const x of truoc) {
          const e = nb[x.key];
          if (!e) continue;
          const ne = Object.assign({}, e, { ts: Date.now() });
          // Trả về ĐÚNG hình dạng cũ, kể cả lúc cũ là "chưa có gì": gán lại
          // mảng rỗng thì `lienVaSau` không dựng lại nữa (nó chỉ chạy khi
          // `lien` vắng mặt), và mục kẹt ở tập rỗng vĩnh viễn.
          if (x.lien) ne.lien = x.lien; else delete ne.lien;
          if (x.lienBo) ne.lienBo = x.lienBo; else delete ne.lienBo;
          nb[x.key] = ne;
        }
      });
      drawNotebook();
      syncSoon();
      toast(T2("Đã nhận lại “{tu}”", { tu: chu }));
      if (khiDoi) khiDoi(false);
    }
  });
}

/** Bấm một từ trong mạng nghĩa: có trong sổ thì lọc tới nó, chưa có thì tra. */
function moTuLien(chu, coSan) {
  if (coSan) {
    const o = $("filter");
    if (o) { o.value = chu; o.dispatchEvent(new Event("input", { bubbles: true })); }
    show("Notebook");
    return;
  }
  $("q").value = chu;
  show("Lookup");
  runLookup(chu);
}

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
      let thang = false;                 // có vừa thăng một mục dẫn xuất không
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
          // Tiến độ đa-đường và dữ liệu máy tự bồi: tra lại cùng một từ không
          // được xoá công ôn tập, cũng không được bắt moi lại câu ngữ cảnh.
          if (old2.duong) ne2.duong = old2.duong;
          if (old2.cauNghe) ne2.cauNghe = old2.cauNghe;
          if (old2.lien) ne2.lien = old2.lien;
          if (old2.kind) ne2.kind = old2.kind;
          if (old2.fav) ne2.fav = old2.fav;
          if (old2.note) ne2.note = old2.note;
          if (old2.hoiAi) ne2.hoiAi = old2.hoiAi;   // link đoạn chat Gemini
          if (old2.lienBo) ne2.lienBo = old2.lienBo;  // từ liên kết đã tự tay bỏ
          // Hai công tắc rút bớt việc: tra lại rồi bấm Lưu KHÔNG có nghĩa "cho từ
          // này học lại từ đầu". Không giữ thì mỗi lượt tra lại là một từ đã đóng
          // băng lặng lẽ quay về hàng đợi.
          if (old2.mangTat) ne2.mangTat = 1;
          if (old2.dongBang) ne2.dongBang = 1;
          // `tuCum` CỐ Ý không giữ: tra rồi tự tay bấm Lưu là quyết định có chủ
          // ý, mục thôi làm từ dẫn xuất. `lien` cũng bị bỏ ngay dưới để boiThem
          // dựng lại tập đầy đủ — giữ tập rút gọn thì thăng chẳng để làm gì.
          if (old2.tuCum) { delete ne2.lien; thang = true; }
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
      // Còn trắng cách đọc mà vẫn có chữ Hán, tức đây là một cụm dài — thứ mà
      // docKana cố tình không đụng tới. Ghép furigana theo từng khúc chữ Hán.
      if ((huong === "javi" || huong === "vija") && !en.reading) {
        rubyVaSau(key, en.word).then(() => drawNotebook(), () => {});
        boiThem(key);         // câu ngữ cảnh + tập từ liên, chạy ngầm
      } else if (thang) {
        // Vừa thăng một mục dẫn xuất lên từ gốc: `lien` đã bị bỏ ở trên, phải
        // gọi bồi để dựng lại tập đầy đủ. Không có dòng này thì mục thăng xong
        // lại trắng tập liên kết — tệ hơn cả lúc chưa thăng.
        boiThem(key);
      }
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
  const t = donDich(text).slice(0, 5000);
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
  // 1) gtx của Google (xoay vòng cổng).  2) máy chủ Apps Script của người dùng.
  let out = "";
  try { out = await gtxTranslate(t, from, to); } catch (e) { out = ""; }
  if (!out) {
    const cfg = await layCfg(NGU);
    if (!cfg.url) throw new Error(T("Google đang tạm chặn dịch vì quá nhiều lượt. Thử lại sau ít phút, hoặc cấu hình đồng bộ để dùng máy chủ dự phòng."));
    let r = null;
    try { r = await httpPostJson(cfg.url, { token: cfg.token || "", action: "translate", text: t, from, to }, "text/plain;charset=utf-8"); } catch (e) { r = null; }
    out = (r && r.ok !== false) ? String(r.text || r.translation || r.result || "") : "";
    if (!out) throw new Error(T("Google đang tạm chặn dịch vì quá nhiều lượt, mà máy chủ dự phòng cũng chưa trả về được. Hãy thử lại sau ít phút."));
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

    // Hộp dịch này dùng cho CẢ chế độ Nhật, nên câu lưu ra phải mang đúng hướng
    // đang tra. Đóng đinh "envi" thì một câu tiếng Nhật nằm trong sổ dưới nhãn
    // Anh–Việt: lượt vá furigana lọc theo hướng nên không bao giờ với tới nó, và
    // câu ấy vĩnh viễn không có cách đọc.
    const huongCau = laNhat() ? "javi" : "envi";
    const key = huongCau + ":" + text;
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
    const spk = nutIcon("speaker-high", T("Nghe lại câu gốc"), "", 19);
    spk.addEventListener("click", () => speak(engText));
    phai.appendChild(spk);

    const luuCau = async () => {
      const laMoi = await capNhat((nb) => {
        const oldS = nb[key];
        const neS = { word: text, reading: "", means: [out], dict: huongCau, kind: "sent", ts: Date.now() };
        if (srcSnap) neS.src = srcSnap;
        if (oldS && !oldS.del) {
          if (oldS.deck) neS.deck = oldS.deck;
          if (oldS.srs) neS.srs = oldS.srs;
          if (oldS.duong) neS.duong = oldS.duong;
          if (oldS.cauNghe) neS.cauNghe = oldS.cauNghe;
          if (oldS.lien) neS.lien = oldS.lien;
          if (oldS.hoiAi) neS.hoiAi = oldS.hoiAi;
          if (oldS.lienBo) neS.lienBo = oldS.lienBo;
          if (oldS.mangTat) neS.mangTat = 1;
          if (oldS.dongBang) neS.dongBang = 1;
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
      // Câu tiếng Nhật thì ghép furigana theo từng khúc chữ Hán. Chạy sau và
      // KHÔNG chờ: bấm Lưu thì phải lưu xong ngay.
      if (huongCau === "javi") rubyVaSau(key, text).then(() => drawNotebook(), () => {});
      boiThem(key);           // câu ngữ cảnh + tập từ liên, chạy ngầm
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

/*
 * Chỗ xem ảnh to, dựng trong app.
 *
 * Trước đây chỗ này gọi `window.open(blobUrl)`. Trên máy tính đó là một tab
 * mới, có thanh địa chỉ và nút đóng, nên không ai để ý. Trong WebView của app
 * Android thì không có gì như thế: ảnh nạp thẳng vào khung hiện tại, theo đúng
 * cỡ pixel gốc — ảnh chụp màn hình điện thoại rộng hơn màn nên chỉ thấy được
 * góc trên bên trái, trông y như bị phóng to — và tuyệt nhiên không có nút nào
 * để ra. Người dùng kẹt trong đó.
 *
 * Nên app tự dựng lấy. Hai điều bắt buộc:
 *   - ảnh VỪA MÀN HÌNH khi mở, phóng to là do người dùng chủ động chạm;
 *   - có BỐN đường ra, không chỉ một: nút ✕, chạm nền, phím Esc, nút Quay lại
 *     của Android (xem chỗ gọi nutQuayLai). Chỉ chừa một đường thì bấm trượt
 *     một cái là lại kẹt.
 */
let anhDangXem = null;   // { id, url } — url do chính chỗ này tạo ra và thu lại

function dongAnhXem() {
  const h = $("anhXem");
  if (!h.classList.contains("show")) return false;
  h.classList.remove("show");
  h.setAttribute("aria-hidden", "true");
  $("anhXemKhung").classList.remove("to");
  $("anhXemImg").removeAttribute("src");
  // Thu lại blob URL của riêng bộ xem. Không thu thì mỗi lần mở một ảnh là giữ
  // thêm một bản trong bộ nhớ cho tới lúc đóng app.
  if (anhDangXem && anhDangXem.url) {
    try { URL.revokeObjectURL(anhDangXem.url); } catch (e) { /* đã thu rồi thì thôi */ }
  }
  anhDangXem = null;
  return true;
}

async function moAnh(f) {
  // Tự lấy blob và tự tạo URL, KHÔNG dùng Anh.url(): kho URL dùng chung bị
  // Anh.nhaUrl() thu sạch mỗi lần vẽ lại danh sách, mà danh sách hoàn toàn có
  // thể vẽ lại trong lúc ảnh đang mở — lúc ấy ảnh trắng bóc không rõ vì sao.
  let ban = null;
  try { ban = await window.Anh.lay(f.id); } catch (e) { ban = null; }
  if (!ban || !ban.blob) { toast(T("Không mở được ảnh này."), "bad"); return; }
  dongAnhXem();
  anhDangXem = { id: f.id, url: URL.createObjectURL(ban.blob) };
  $("anhXemImg").src = anhDangXem.url;
  $("anhXemImg").alt = f.ten || "";
  $("anhXemTen").textContent = (f.ten || "") + " · " + window.Anh.coChu(f.cd);
  const h = $("anhXem");
  h.classList.add("show");
  h.setAttribute("aria-hidden", "false");
  $("anhXemDong").focus();
}

$("anhXemDong").addEventListener("click", dongAnhXem);
// Bàn phím ngoài (máy tính bảng có bàn phím, hoặc lúc chạy thử trên trình
// duyệt): Esc phải đóng được. Bắt ở giai đoạn capture để phiếu sửa bên dưới
// không nuốt mất — ảnh đang nằm trên nó.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (dongAnhXem()) { e.preventDefault(); e.stopPropagation(); }
}, true);
// Chạm vào nền (không phải vào chính tấm ảnh) là đóng.
$("anhXem").addEventListener("click", (e) => {
  if (e.target === $("anhXemImg") || e.target === $("anhXemDong")) return;
  dongAnhXem();
});
// Chạm vào ảnh: đổi giữa vừa-màn-hình và cỡ thật. Ảnh đính kèm phần lớn là ảnh
// chụp màn hình có chữ, vừa màn hình thì đọc không nổi.
$("anhXemImg").addEventListener("click", (e) => {
  e.stopPropagation();
  $("anhXemKhung").classList.toggle("to");
});

/** Một ô ảnh: bấm vào là mở to, bấm dấu × là gỡ. */
function oAnh(f, choGo) {
  const o = el("button", "anh-o");
  o.type = "button";
  o.title = f.ten + " · " + window.Anh.coChu(f.cd);
  const img = document.createElement("img");
  img.alt = f.ten;
  o.appendChild(img);
  window.Anh.url(f.id).then((u) => { if (u) img.src = u; });
  o.addEventListener("click", () => { moAnh(f); });
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
  const dangHoc = theCardHienTai();
  if (dangHoc && dangHoc.key === key) {
    Object.assign(dangHoc, kq.ne);
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
const DONGBANG = "__freeze__";   // sổ con ảo: những từ đã rút khỏi vòng ôn
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

/* ==================================================================== */
/* Hai công tắc rút bớt việc                                         */
/* ==================================================================== */

/**
 * Bật/tắt một cờ trên một mục (`dongBang` hoặc `mangTat`).
 *
 * Cả hai đều chỉ là một số 1 ghi vào mục; toàn bộ hệ quả nằm trong `srs.js`
 * (`Srs.denHan` và `Srs.duongCo` đọc chúng). Nên ở đây không có luật nào hết,
 * và đó là chủ ý: luật nằm một chỗ thì bản extension và bản này không lệch được.
 */
async function datCo(key, ten, bat) {
  await capNhat((nb) => {
    const e = nb[key];
    if (!e || e.del) return;
    const ne = Object.assign({}, e, { ts: Date.now() });
    if (bat) ne[ten] = 1; else delete ne[ten];
    nb[key] = ne;
  });
  syncSoon();
  return bat;
}

/**
 * Hai nút trên thẻ sổ tay: Đóng băng, và Tắt bài mạng nghĩa.
 *
 * ĐẶT Ở ĐÂY, không nhét vào khối mạng nghĩa. `khoiLien` trả `null` khi hai
 * danh sách đều rỗng, nên nhét vào đó thì có trường hợp cờ đang bật mà không
 * còn nút nào để tắt.
 *
 * Trạng thái đọc được KHÔNG CẦN MÀU: bông tuyết đặc là đang đóng băng, còn
 * mạng nghĩa tắt thì icon đeo một gạch chéo (lớp `tat` trong CSS).
 */
function nutRutOn(it, sauDo) {
  const wrap = el("span", "rowx");
  wrap.style.gap = "0";

  const bang = !!it.dongBang;
  const b1 = el("button", "iconbtn bang" + (bang ? " on" : ""));
  b1.type = "button";
  b1.title = bang
    ? T("Đang đóng băng — bấm để đưa lại vào vòng ôn, từ sẽ tới hạn ngay")
    : T("Đóng băng — rút từ này khỏi chế độ học, điểm giữ nguyên");
  b1.innerHTML = window.Icon("snowflake", { size: 18, weight: bang ? "solid" : "line" });
  b1.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (await datCo(it.key, "dongBang", !bang)) it.dongBang = 1; else delete it.dongBang;
    if (sauDo) sauDo(); else drawNotebook();
  });
  wrap.appendChild(b1);

  const tat = !!it.mangTat;
  const b2 = el("button", "iconbtn mang" + (tat ? " on tat" : ""));
  b2.type = "button";
  b2.title = tat
    ? T("Bài đồng/trái nghĩa đang tắt — bấm để bật lại")
    : T("Tắt bài đồng/trái nghĩa cho từ này — danh sách liên kết vẫn giữ nguyên");
  b2.innerHTML = window.Icon("graph", { size: 18 });
  b2.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (await datCo(it.key, "mangTat", !tat)) it.mangTat = 1; else delete it.mangTat;
    if (sauDo) sauDo(); else drawNotebook();
  });
  wrap.appendChild(b2);
  return wrap;
}

/**
 * Bật/tắt một cờ cho CẢ DANH SÁCH ĐANG HIỆN, một lượt ghi, một lần Hoàn tác.
 *
 * Một lượt `capNhat` chứ không phải N lượt: rà cả sổ là hàng trăm mục, mỗi mục
 * một lượt ghi + một lượt đồng bộ thì vừa chậm vừa có lúc chết giữa chừng.
 *
 * Chụp lại ĐÚNG NHỮNG MỤC THẬT SỰ ĐỔI — không phải cả danh sách. Hoàn tác mà
 * đi gỡ cờ của mấy mục vốn đã bật sẵn từ trước thì nó làm hơn những gì nó hứa.
 */
async function lamHangLoat(ds, ten, bat, chuXong, chuHoanTac) {
  const khoa = ds.filter((it) => !!it[ten] !== bat).map((it) => it.key);
  if (!khoa.length) return;
  await capNhat((nb) => {
    for (const k of khoa) {
      const e = nb[k];
      if (!e || e.del) continue;
      const ne = Object.assign({}, e, { ts: Date.now() });
      if (bat) ne[ten] = 1; else delete ne[ten];
      nb[k] = ne;
    }
  });
  await drawNotebook();
  syncSoon();
  toast(T2(chuXong, { n: khoa.length }), null, {
    chu: T("Hoàn tác"),
    lam: async () => {
      await capNhat((nb) => {
        for (const k of khoa) {
          const e = nb[k];
          if (!e) continue;
          const ne = Object.assign({}, e, { ts: Date.now() });
          if (bat) delete ne[ten]; else ne[ten] = 1;
          nb[k] = ne;
        }
      });
      await drawNotebook();
      syncSoon();
      toast(T2(chuHoanTac, { n: khoa.length }));
    }
  });
}

/**
 * Hàng thao tác hàng loạt — CHỈ BAO GIỜ MỜI BẠN GỠ, không bao giờ mời bạn LÀM.
 *
 * Bản 4.25.0 có hai nút làm-hàng-loạt ở đây ("Tắt mạng nghĩa (N)" và "Đóng
 * băng (N)") và cả hai đều sai, theo ba cách cùng lúc:
 *
 *   1. CỬA MỘT CHIỀU. Nút tắt dựng từ danh sách những từ CHƯA tắt, nên tắt
 *      hết rồi là nó biến mất — và không còn đường nào bật lại hàng loạt. Phải
 *      đi bấm lại từng từ một.
 *   2. MỘT NÚT TRƠN ngay đầu danh sách, không hỏi lại, chạm một cái là ghi
 *      lại N mục.
 *   3. CỬA SỔ HOÀN TÁC 6,5 GIÂY — đủ để đọc, không đủ để nhận ra mình
 *      vừa bấm nhầm rồi quyết định.
 *
 * Còn "đóng băng toàn bộ" thì ngay cả khi bấm đúng cũng vô nghĩa: rút hết từ
 * ra khỏi vòng ôn thì còn gì để học.
 *
 * LUẬT: hàng loạt được phép khi nó GỠ, không được phép khi nó LÀM. Làm thì
 * bấm từng từ bằng `nutRutOn` — một lần bấm, một từ, bấm lại là xong.
 *
 * Và hai nút gỡ KHÔNG bám theo ngăn nữa (trước đây "Gỡ băng tất cả" chỉ hiện
 * trong ngăn Đóng băng): chúng hiện khi danh sách ĐANG NHÌN có cái để gỡ. Bám
 * theo ngăn thì "Bật lại mạng nghĩa" chẳng có ngăn nào để nấp, và lại đẻ ra đúng
 * cái cửa một chiều vừa đi chữa.
 */
function veHangLoat(rows) {
  const o = $("hangLoat");
  if (!o) return;
  o.innerHTML = "";
  const nut = (chu, hanhDong) => {
    const b = el("button", "btn sm");
    b.type = "button";
    b.textContent = chu;
    b.addEventListener("click", hanhDong);
    o.appendChild(b);
  };
  const daBang = rows.filter((it) => !!it.dongBang);
  const daTat = rows.filter((it) => !!it.mangTat);

  if (daBang.length) {
    nut(T2("Gỡ băng tất cả ({n})", { n: daBang.length }), () =>
      lamHangLoat(daBang, "dongBang", false,
        "Đã gỡ băng {n} từ — chúng tới hạn ngay từ buổi học tới",
        "Đã đóng băng lại {n} từ"));
  }
  if (daTat.length) {
    nut(T2("Bật lại mạng nghĩa ({n})", { n: daTat.length }), () =>
      lamHangLoat(daTat, "mangTat", false,
        "Đã bật lại bài đồng/trái nghĩa cho {n} từ",
        "Đã tắt bài đồng/trái nghĩa cho {n} từ"));
  }
  o.style.display = o.children.length ? "" : "none";
}

/** Khối ghi chú riêng, hiện dưới phần nghĩa. */
/** Mở một đường link ngoài bằng trình duyệt của máy, như nút mở nguồn. */
function MO_LINK(url) {
  try { window.open(url, "_system"); }
  catch (e) { try { window.open(url, "_blank"); } catch (e2) { location.href = url; } }
}

/*
 * Khối ghi chú hiện ra khi có ghi chú HOẶC có link đoạn chat.
 *
 * Điều kiện cũ chỉ xét `note`, nên mục được ghi link mà chưa từng viết ghi chú
 * thì cả khối không dựng — link coi như mất, mà chẳng có gì báo.
 */
function coGhiChu(it) {
  return !!((it.note && it.note.trim()) || (it.hoiAi && it.hoiAi.url));
}

/**
 * Khối "Ghi chú của bạn" — chữ bạn viết, và link đoạn chat Gemini nếu có.
 *
 * Hai thứ nằm chung một khối nhưng KHÔNG chung một ô chữ. Nhét link vào thẳng
 * ghi chú thì chữ máy ghi lẫn chữ bạn viết: sửa ghi chú có thể xoá nhầm link,
 * và mỗi lần hỏi lại là ô ghi chú dài thêm một đoạn. Để rời thì mỗi bên một
 * việc, và cái nút mở nằm đúng chỗ mắt đang nhìn.
 *
 * @param {string} chu    ghi chú tự viết (có thể rỗng)
 * @param {{url:string, ts:number}} [hoiAi]  đoạn chat Gemini gần nhất
 */
function khoiGhiChu(chu, hoiAi) {
  const box = el("div", "mynote");
  const h = el("div", "nh");
  h.appendChild(ic("note-pencil", { size: 13 }));
  h.appendChild(el("span", null, T("Ghi chú của bạn")));
  box.appendChild(h);
  if (chu) box.appendChild(el("div", null, chu));
  if (hoiAi && hoiAi.url) {
    const hang = el("div", "hoiai");
    hang.appendChild(ic("sparkle", { size: 13 }));
    let ngay = "";
    try { ngay = new Date(hoiAi.ts).toLocaleDateString("vi-VN"); } catch (e) { ngay = ""; }
    hang.appendChild(el("span", "nhan", T("Hỏi Gemini") + (ngay ? " \u00b7 " + ngay : "")));
    const mo = el("button", "chip nho", T("Mở"));
    mo.type = "button";
    mo.title = hoiAi.url;
    mo.addEventListener("click", (ev) => { ev.stopPropagation(); MO_LINK(hoiAi.url); });
    hang.appendChild(mo);
    box.appendChild(hang);
  }
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
/* ==================================================================== */
/* Hỏi Gemini                                                           */
/* ==================================================================== */

/**
 * Những thứ `hoi-gemini.js` không tự tính được, phải lấy từ màn này.
 *
 * `tenSo` truyền vào chứ không tự tra: ở sổ tay thì bảng sổ con đã nằm sẵn
 * trong tầm tay, còn ở buổi học thì phải đi hỏi kho — mà chỉ để ghi thêm một
 * dòng "nằm trong sổ X" thì không đáng bắt người ta chờ.
 */
function phuGemini(it, tenSo) {
  const p = {};
  const hv = hanVietOf(it.word);
  if (hv) p.hanViet = hv;
  if (it.dict === "kanji" && it.kanji && window.HanTu) {
    const m = window.HanTu.META(it.kanji);
    if (m) p.chuHan = m;
  }
  try {
    const d = window.Srs.diemTu(it);
    if (d && isFinite(d.tong)) p.diem = { tong: d.tong, ten: d.ten };
  } catch (e) { /* chưa có tiến độ thì thôi */ }
  if (tenSo) p.so = tenSo;
  return p;
}

/**
 * Chép một đoạn dài vào bộ nhớ tạm.
 *
 * WebView của Capacitor phục vụ trang qua https://localhost nên
 * `navigator.clipboard` thường chạy được — nhưng "thường" thì chưa đủ để dựa
 * vào, vì máy Android cũ và WebView bị hạ cấp thì nó vắng mặt. Ngả thứ hai là
 * `execCommand("copy")`: cũ kỹ, đã bị khai tử trên giấy tờ, nhưng vẫn chạy ở
 * đúng những chỗ mà cái mới không có.
 */
async function chepChu(chu) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(chu);
      return true;
    }
  } catch (e) { /* rơi xuống ngả dưới */ }
  try {
    const o = document.createElement("textarea");
    o.value = chu;
    o.setAttribute("readonly", "");
    // Ngoài khung nhìn chứ KHÔNG display:none — ô ẩn hẳn thì không chọn được
    // chữ trong đó, mà không chọn được thì không có gì để chép.
    o.style.cssText = "position:fixed;top:-1000px;left:-1000px;opacity:0";
    document.body.appendChild(o);
    o.select();
    o.setSelectionRange(0, chu.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(o);
    return !!ok;
  } catch (e) { return false; }
}

/**
 * Chép câu hỏi vào bộ nhớ tạm rồi mở Gemini.
 *
 * Bản đầu gửi câu hỏi qua `?q=` trên đường dẫn. Đo thật thì không chạy:
 * gemini.google.com nạp đúng đường dẫn ấy nhưng ô chat vẫn trống trơn. Và
 * hỏng theo kiểu im lặng — trang mở ra bình thường, không báo lỗi gì, người
 * dùng chỉ thấy ô trống và tưởng nút hỏng.
 *
 * Nên bộ nhớ tạm là đường CHÍNH chứ không còn là đường lui. Thêm đúng một
 * thao tác dán, đổi lại thì chắc chắn chạy.
 *
 * Chép hỏng thì KHÔNG mở Gemini. Mở ra một ô trống mà chẳng có gì để dán chỉ
 * làm người ta tưởng đã xong rồi loay hoay ở đầu bên kia.
 */
async function moGemini(it, tenSo) {
  if (!it || !it.word) return;
  dungDongHo();                 // sang Gemini đọc thì cũng thôi là truy xuất
  const loi = window.HoiGemini.loiHoi(it, phuGemini(it, tenSo));
  if (!(await chepChu(loi))) {
    toast(T("Không chép được câu hỏi vào bộ nhớ tạm — bấm lại một lần nữa."), "bad");
    return;
  }
  const url = window.HoiGemini.GOC_URL;
  // "_system" = giao cho trình duyệt của máy, giống hệt nút mở nguồn. Mở trong
  // chính WebView thì Google chặn đăng nhập, mà không đăng nhập thì Gemini
  // không dùng được.
  try { window.open(url, "_system"); }
  catch (e) { try { window.open(url, "_blank"); } catch (e2) { location.href = url; } }
  // Trên điện thoại không có Ctrl+V — nói đúng thao tác thật của máy cảm ứng.
  toast(T("Đã chép câu hỏi — sang Gemini, chạm giữ vào ô chat rồi chọn Dán."));
}

/** Nút "hỏi Gemini" trong thẻ sổ tay. Thẻ học dùng nút riêng ở HTML (#stGemini). */
function nutGemini(it, tenSo) {
  const b = nutIcon("sparkle", T("Hỏi Gemini về từ này kèm ngữ cảnh đã lưu"), "gemini", 18);
  b.addEventListener("click", (ev) => { ev.stopPropagation(); moGemini(it, tenSo); });
  return b;
}

function openSourceExt(it) {
  // Dừng ĐỒNG HỒ Ở ĐÂY, không ở từng nút: mọi đường mở nguồn đều đi qua đây.
  // Đặt ở nút thì sớm muộn có một lối quên, và quên thì không có gì báo.
  dungDongHo();
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
  // Nhớ lại danh sách từ đã có, cho mạng nghĩa ở cả sổ tay lẫn mặt sau thẻ học.
  tuDaLuu = new Set(activeItems.map((x) => x.word).filter(Boolean));
  mucDaLuu = activeItems;
  if (curDeck !== ALL && curDeck !== NONE && curDeck !== LIKE && curDeck !== DISLIKE
      && curDeck !== HANTU && curDeck !== DONGBANG && !deckName(decks, curDeck)) curDeck = ALL;

  /* --- hàng chip sổ con --- */
  const bar = $("deckBar");
  bar.innerHTML = "";
  const activeDecks = Object.values(decks).filter((d) => !d.del).sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const countIn = (id) => setIn(activeItems, id).length;
  const denHanIn = (id) => { const now = Date.now(); return setIn(activeItems, id).filter((i) => isDue(i, now)).length; };
  /*
   * Mỗi ngăn là một CẶP: chip để mở ra xem, và nút học của riêng ngăn đó.
   *
   * Buổi học giờ chỉ lấy mục trong ngăn đang mở, nhưng muốn dùng thì phải tự
   * đoán ra luật ấy: bấm ngăn, rồi sang màn Học bấm tiếp. Nút học nằm ngay trên
   * ngăn thì "ôn nhanh đúng chỗ mình muốn" chỉ còn một cú chạm.
   *
   * Chỉ hiện khi ngăn ấy CÓ mục tới hạn: ngăn nào cũng đeo một nút thì hàng ngăn
   * dài gấp đôi mà phần lớn chạm vào chỉ nhận được câu "chưa tới hạn".
   */
  const mk = (id, label, iconTen) => {
    const cum = el("span", "chipgroup");
    const b = el("button", "chip" + (curDeck === id ? " active" : ""));
    b.type = "button";
    b.appendChild(ic(iconTen, { size: 15, weight: curDeck === id ? "solid" : "line" }));
    b.appendChild(el("span", null, label));
    b.appendChild(el("span", "n", String(countIn(id))));
    b.addEventListener("click", () => { curDeck = id; drawNotebook(); });
    cum.appendChild(b);

    const den = denHanIn(id);
    if (den) {
      const h = el("button", "chip hoc");
      h.type = "button";
      h.title = T2("Ôn ngay {n} mục đến hạn trong “{ten}”", { n: den, ten: label });
      h.appendChild(ic("graduation-cap", { size: 14, weight: "solid" }));
      h.appendChild(el("span", "n", String(den)));
      h.addEventListener("click", async (e) => {
        e.stopPropagation();
        // Mở ngăn ra rồi mới sang màn Học: hết buổi quay lại là thấy đúng ngăn
        // vừa ôn, chứ không rơi về danh sách tất cả.
        curDeck = id;
        await drawNotebook();
        show("Study");
        await updateDueButton();
        $("stStart").click();
      });
      cum.appendChild(h);
    }
    bar.appendChild(cum);
  };
  mk(ALL, T("Tất cả"), "list-bullets");
  mk(NONE, T("Chưa phân loại"), "funnel");
  mk(LIKE, T("Thích"), "heart");
  mk(DISLIKE, T("Không thích"), "thumbs-down");
  // Học chữ và học từ là hai buổi khác nhau, nên Hán tự có ngăn riêng. Bên
  // tiếng Anh không có ngăn này.
  if (laNhat()) mk(HANTU, T("Hán tự"), "text-aa");
  /*
   * Ngăn Đóng băng KHÔNG bao giờ mọc nút Học, mà không phải vì có dòng nào
   * đi chặn: `denHanIn` gọi `isDue` → `Srs.denHan`, mà `denHan` đã trả rỗng cho
   * mọi từ đóng băng. Chỉ hiện khi đã có từ nào đóng băng.
   */
  if (countIn(DONGBANG)) mk(DONGBANG, T("Đóng băng"), "snowflake");
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
    (curDeck !== ALL && curDeck !== NONE && curDeck !== LIKE && curDeck !== DISLIKE
     && curDeck !== HANTU && curDeck !== DONGBANG) ? "" : "none";

  /* --- danh sách --- */
  const kw = $("filter").value.trim().toLowerCase();
  let rows = activeItems;
  if (curDeck === NONE) rows = rows.filter((i) => !i.deck);
  else if (curDeck === LIKE) rows = rows.filter((i) => i.fav === 1);
  else if (curDeck === DISLIKE) rows = rows.filter((i) => i.fav === -1);
  else if (curDeck === HANTU) rows = rows.filter((i) => i.dict === "kanji");
  else if (curDeck === DONGBANG) rows = rows.filter((i) => !!i.dongBang);
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
  veHangLoat(rows);

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
    // Ghi âm nằm NGAY CẠNH nút phát âm: nghe mẫu rồi đọc lại là một mạch, tách
    // hai nút ra hai chỗ thì mỗi vòng đọc theo lại phải đi tìm.
    head.appendChild(cumGhiAm(it.key));
    head.appendChild(favButtons(it));
    head.appendChild(nutRutOn(it));
    head.appendChild(el("span", "tag", dirLabel(it.dict)));
    if (it.mEdit) {
      const t = el("span", "tag edited");
      t.appendChild(ic("pencil-simple", { size: 12 }));
      t.appendChild(el("span", null, T("đã sửa")));
      head.appendChild(t);
    }
    // Điểm và hạn ôn đi cùng một chỗ — xem ghi chú cùng chỗ này bên bản
    // extension. Chip bấm được: mở bảng bốn đường và ôn ngay bài còn lại.
    head.appendChild(chipDiem(it, now));
    body.appendChild(head);

    const hvS = hanVietOf(it.word);
    if (hvS) body.appendChild(el("div", "hv", T2("Hán Việt: {am}", { am: hvS })));
    if (it.dict === "kanji") {
      const km = window.HanTu.META(it.kanji);
      if (km) body.appendChild(el("div", "t-tiny faint", km));
    }
    if (it.means && it.means.length) body.appendChild(el("div", "m", it.means.slice(0, 4).join("; ")));
    const mangNb = khoiLien(it, true);
    if (mangNb) body.appendChild(mangNb);
    if (coGhiChu(it)) body.appendChild(khoiGhiChu((it.note || "").trim(), it.hoiAi));
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

    // Hỏi Gemini đứng ĐẦU hàng: mấy nút còn lại đều là sửa cái đã có, nút này
    // là đi hỏi thêm — việc khác loại, và là việc hay cần nhất lúc gặp lại một
    // từ mà không nhớ nó nằm trong câu nào.
    ctl.appendChild(nutGemini(it, deckName(decks, it.deck)));

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
function veKhoChung() {
  const bat = $("syncChungBat") && $("syncChungBat").checked;
  if ($("syncChungO")) $("syncChungO").style.display = bat ? "" : "none";
  [$("syncUrl"), $("syncToken")].forEach((o) => {
    if (!o) return;
    o.disabled = !!bat;
    o.style.opacity = bat ? "0.45" : "";
  });
}
if ($("syncChungBat")) $("syncChungBat").addEventListener("change", veKhoChung);

$("saveCfg").addEventListener("click", async () => {
  if ($("syncChungBat")) {
    const bat = $("syncChungBat").checked;
    await Store.set("syncChung", bat
      ? { url: $("syncUrlChung").value.trim(), token: $("syncTokenChung").value.trim() }
      : {});
  }
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

/**
 * Các mục nằm trong một ngăn. Một chỗ duy nhất trả lời câu "ngăn này có gì", để
 * cái ĐẾM trên chip, cái HỌC của ngăn đó và danh sách đang hiện không bao giờ
 * nói ba con số khác nhau.
 */
function setIn(list, id) {
  if (id === ALL) return list;
  if (id === NONE) return list.filter((i) => !i.deck);
  if (id === LIKE) return list.filter((i) => i.fav === 1);
  if (id === DISLIKE) return list.filter((i) => i.fav === -1);
  if (id === HANTU) return list.filter((i) => i.dict === "kanji");
  /*
   * Từ đóng băng VẪN NẰM TRONG "Tất cả" — ngăn này là một lối xem, không
   * phải một chỗ cất. Ẩn chúng đi thì có từ "biến mất" khỏi sổ và khỏi ô
   * tìm kiếm, rồi vài tháng sau người ta tưởng mình đã xoá nhầm.
   */
  if (id === DONGBANG) return list.filter((i) => !!i.dongBang);
  return list.filter((i) => i.deck === id);
}

/** Tên đọc được của một ngăn dựng sẵn (sổ con thì hỏi deckName). */
function nhanNgan(id) {
  if (id === NONE) return T("Chưa phân loại");
  if (id === LIKE) return T("Thích");
  if (id === DISLIKE) return T("Không thích");
  if (id === HANTU) return T("Hán tự");
  if (id === DONGBANG) return T("Đóng băng");
  return "";
}

/**
 * Các mục đến hạn ôn — CHỈ trong ngăn đang mở.
 *
 * Trước đây hàm này đọc cả sổ, nên bấm vào một sổ con rồi sang màn Học vẫn ra
 * nguyên cả sổ tay: người ta muốn ôn nhanh đúng một thư mục thì không có cách
 * nào làm được.
 */
/**
 * Hàng đợi của một buổi học: mỗi phần tử là một cặp (mục, ĐƯỜNG), không phải
 * một mục. Một từ có thể đến hạn ở đường nhìn mà chưa đến hạn ở đường nghe.
 */
/* -------------------------------------------------------------------- */
/* Ôn kèm cả cụm                                                         */
/* -------------------------------------------------------------------- */
/*
 * Một từ tới hạn thì kéo luôn những từ nối với nó qua tập đồng/trái nghĩa vào
 * CÙNG BUỔI, xếp LIỀN NHAU.
 *
 * Nối LỊCH, không nối điểm — xem khối chú thích dài ở tu-lien.js về việc vì sao
 * không cộng/trừ điểm chéo. Gặp 改善 rồi 改良 rồi 改悪 liền một mạch thì buộc
 * phải phân biệt, chứ đứng riêng mỗi từ một ngày thì đoán theo ngữ cảnh cũng
 * qua. Mà không con số nào bị bịa thêm.
 */

/*
 * Hai con số này ĐO ra chứ không chọn bừa, vì việc này làm TĂNG số thẻ mỗi buổi
 * — đúng thứ vừa mới phải đi chữa.
 *
 * Đo trên 600 từ / 180 ngày, mỗi từ nối với 2–4 từ lân cận (giống cảnh lưu từ
 * ngay ở màn kết quả). Nền khi TẮT ôn kèm: 232 thẻ/ngày, đỉnh 525.
 *
 *   4 bạn · nghỉ 3 ngày    → 481 thẻ/ngày (+107%), đỉnh 826   ← gấp đôi, bỏ
 *   2 bạn · nghỉ 7 ngày    → 313 (+35%),  đỉnh 610
 *   2 bạn · nghỉ 14 ngày   → 276 (+19%),  đỉnh 585            ← chọn cái này
 *   3 bạn · nghỉ 21 ngày   → 285 (+23%),  đỉnh 590
 *
 * Hai bạn là đủ: cộng cả từ đang tới hạn thì người học thấy BA từ gần nghĩa
 * cạnh nhau, vừa đủ để phải phân biệt mà chưa thành một bài dài. Nghỉ 14 ngày
 * nghĩa là mỗi cụm được ôn chừng hai lần một tháng.
 */
/** Kéo tối đa ngần này từ cùng cụm cho một khối. */
const CUM_TOI_DA = 2;

/**
 * Hàng đợi của một buổi học: mảng các KHỐI, mỗi khối là các thẻ phải đi liền.
 *
 * Trả về khối chứ không trả về mảng phẳng, vì `startStudy` phải xáo được thứ tự
 * mà không đánh tung cụm — xáo phẳng thì 改善 rơi đầu buổi, 改良 rơi cuối, và cả
 * việc này thành công cốc.
 *
 * @returns {Array<Array>} mỗi phần tử là một khối thẻ
 */
function hangDoiKhoi(scopeList) {
  const now = Date.now();
  const batCum = CAI_NHIP.onCum !== false;
  const chiMuc = batCum ? window.TuLien.chiMucLien(scopeList) : null;
  const theoKhoa = new Map(scopeList.map((x) => [x.key, x]));
  /**
   * Khoá đã NẰM TRONG một khối rồi — dù là khối của chính nó hay bị hút vào
   * khối của từ khác.
   *
   * Phải kiểm ở CẢ HAI chỗ: lúc chọn bạn cùng cụm, VÀ ở đầu vòng lặp chính.
   * Bản đầu chỉ kiểm ở chỗ thứ nhất, nên một từ vừa cùng cụm với từ khác vừa
   * TỰ tới hạn thì được phát hai lần — một lần làm bạn trong khối kia, một lần
   * làm khối của chính nó:
   *
   *     khối 0: A/nhin  A/dong  B/nhin
   *     khối 1: B/nhin                    ← cùng từ, cùng đường, lần thứ hai
   *
   * Đo 600 từ / 180 ngày: 3.953 lượt lặp (tắt ôn kèm thì 0). Và nó không chỉ
   * phiền mắt — `gradeWord` đọc lại trạng thái từ kho ở mỗi lượt, nên thẻ thứ
   * hai nhân tiếp lên kết quả của thẻ thứ nhất: 7 → 14,7 → 30,9 ngày, phồng
   * gấp 2,1 lần so với một lượt đúng lẽ ra được hưởng. Một lượt trả lời đúng bị
   * tính thành hai, và lần sau gặp lại thì đã quá muộn so với trí nhớ thật.
   */
  const daXuLy = new Set();
  const khoi = [];
  const the = (m, d, them) => Object.assign({}, m, { _d: d }, them || {});

  for (const it of scopeList) {
    if (it.del) continue;
    if (daXuLy.has(it.key)) continue;      // đã bị hút vào khối của từ khác
    const han = window.Srs.denHan(it, now);
    if (!han.length) continue;
    const k = han.map((d) => the(it, d));
    daXuLy.add(it.key);

    /*
     * CHỈ TỪ MỞ ĐẦU KHỐI mới được kéo cụm; bạn bị hút vào không kéo tiếp cụm
     * của nó. Không có chốt ấy thì khối nở dây chuyền; có nó thì khối luôn gói
     * gọn trong 1 + CUM_TOI_DA từ.
     *
     * VÀ CHỈ KÉO BẠN ĐÃ TỚI HẠN. Đây là chỗ đổi quan trọng nhất của cả tính
     * năng ôn kèm cụm, nên nói rõ vì sao.
     *
     * Bản trước còn kéo cả bạn CHƯA tới hạn — một thẻ "nhìn" đánh dấu `_som`,
     * với ý "chỉ cho xem chứ không tính điểm". Nhưng nó chỉ nửa vời: trả lời
     * đúng thì không được gì, trả lời SAI thì vẫn bị chấm quên và rút lịch
     * lại. Tức là một thẻ chỉ có thể làm hại chứ không bao giờ làm lợi.
     *
     * Đo 180 ngày (sổ 600 từ · mô phỏng trong kiem-tra/srs-tai.mjs):
     *
     *                            thẻ/ngày   điểm TB   lượt xếp cạnh nhau
     *   tắt ôn kèm cụm              281       68,4            0
     *   kéo cả bạn chưa tới hạn     318       65,2        5.312
     *   chỉ kéo bạn đã tới hạn      275       69,0       20.034
     *
     * Bản cũ trả thêm 13% số thẻ để MẤT 3 điểm, mà còn được ÍT lượt xếp cạnh
     * nhau hơn hẳn. Bỏ thẻ chưa tới hạn đi thì ôn kèm cụm thành thuần XẾP LẠI
     * THỨ TỰ: không thêm một thẻ nào vào buổi học, chỉ đổi chỗ đứng của những
     * thẻ vốn đã tới hạn.
     *
     * Lọc TRƯỚC khi cắt theo CUM_TOI_DA, không phải sau: lọc sau thì hai suất
     * bị mấy từ chưa tới hạn chiếm mất, và từ đã tới hạn đứng ngay sau lại
     * không được vào.
     *
     * Không còn thời gian nghỉ giữa hai lần kéo cùng một cụm. Nó sinh ra để
     * chặn đúng cái tải mà mấy thẻ chưa tới hạn gây ra; giờ không từ nào bị
     * hỏi ngoài lịch của nó nữa nên lý do ấy hết, mà giữ lại thì số lượt xếp
     * cạnh nhau tụt từ 20.034 xuống 6.925.
     */
    if (batCum) {
      const ban = window.TuLien.cumCua(it, chiMuc)
        .map((key) => theoKhoa.get(key))
        .filter((x) => x && !x.del && !daXuLy.has(x.key)
                    && window.Srs.denHan(x, now).length > 0)
        // Điểm thấp nhất lên trước: chúng cần được nhìn lại nhất.
        .sort((a, b) => window.Srs.diemTu(a).tong - window.Srs.diemTu(b).tong)
        .slice(0, CUM_TOI_DA);
      for (const b of ban) {
        /*
         * Hút TRỌN khối của bạn vào đây, đủ mọi đường đang tới hạn.
         *
         * Chỉ lấy một thẻ rồi đánh dấu đã xử lý thì hết lặp thật, nhưng những
         * đường còn lại của nó BIẾN MẤT khỏi buổi học — hết lặp bằng cách nuốt
         * mất việc, còn tệ hơn cái lỗi ban đầu.
         */
        for (const d of window.Srs.denHan(b, now)) k.push(the(b, d, { _cum: it.word }));
        daXuLy.add(b.key);
      }
    }
    khoi.push(k);
  }
  return khoi;
}

/**
 * Hàng đợi theo KHỐI. Xem ghi chú bên bản extension.
 */
async function currentDueKhoi() {
  const nb = await getNBNgu();
  const ds = Object.entries(nb).map(([key, v]) => ({ key, ...v })).filter((it) => !it.del);
  return hangDoiKhoi(setIn(ds, curDeck));
}

/** Bản phẳng, cho nút đếm. Không kéo cụm — nút phải đếm đúng số tới hạn thật. */
async function currentDue() {
  const nb = await getNBNgu();
  const now = Date.now();
  const ds = Object.entries(nb).map(([key, v]) => ({ key, ...v })).filter((it) => !it.del);
  const ra = [];
  for (const it of setIn(ds, curDeck)) {
    for (const d of window.Srs.denHan(it, now)) ra.push(Object.assign({}, it, { _d: d }));
  }
  return ra;
}

async function updateDueButton() {
  const due = await currentDue();
  $("dueCount").textContent = String(due.length);
  if (session.queue.length) return;   // đang học dở thì đừng đụng vào phần thân
  const view = await theoDoi.xem();
  $("stIdleIcon").innerHTML = window.Icon(due.length ? "graduation-cap" : "seal-check",
    { size: 52, weight: "duo" });
  // Nói thẳng buổi học sắp tới lấy mục ở đâu. Chỉ ghi "Có 5 mục đến hạn" thì
  // đang mở một sổ con mà nhìn vào, người ta vẫn tưởng đó là cả sổ tay.
  const dsSo = await getDecks();
  const tenNgan = curDeck === ALL ? "" : (deckName(dsSo, curDeck) || nhanNgan(curDeck));
  $("stIdleTitle").textContent = due.length
    ? (tenNgan ? T2("Có {n} mục đến hạn trong “{ten}”", { n: due.length, ten: tenNgan })
               : T2("Có {n} mục đến hạn", { n: due.length }))
    : (tenNgan ? T2("“{ten}” không còn mục nào đến hạn", { ten: tenNgan })
               : T("Không còn mục nào đến hạn"));
  $("stIdleSub").textContent = view.homNay.dat
    ? T2("Hôm nay đã đạt mục tiêu {dich} lượt. Chuỗi {n} ngày.", { dich: view.goal, n: Math.max(1, view.chuoi.hienTai) })
    : T2("Ôn thêm {n} lượt nữa là đạt mục tiêu hôm nay.", { n: view.homNay.conLai });
  $("stStart").disabled = due.length === 0;
}

$("stStart").addEventListener("click", async () => {
  const due = await currentDue();
  if (!due.length) { toast(T("Không có mục nào đến hạn. Quay lại sau nhé!"), "bad"); return; }
  /*
   * Xáo theo KHỐI, trong khối giữ nguyên — xem ghi chú bên bản extension. Xáo
   * phẳng thì 改善 rơi đầu buổi còn 改良 rơi cuối, và cả việc ôn kèm cụm thành
   * công cốc.
   */
  const khoi = await currentDueKhoi();
  const hang = [];
  for (const k of khoi.slice().sort(() => Math.random() - 0.5)) for (const x of k) hang.push(x);

  session = { queue: hang.length ? hang : due.sort(() => Math.random() - 0.5),
              done: 0, again: 0, deleted: 0 };
  lastDeleted = null;
  $("stUndo").style.display = "none";
  $("stIdle").style.display = "none";
  $("stBody").style.display = "";
  $("stStart").style.display = "none";
  batNhacTau();
  showCard();
});

/**
 * Buổi ôn của MỘT từ, mở thẳng từ chip điểm.
 *
 * Dùng lại nguyên bộ máy của buổi học thường — xem ghi chú bên bản extension.
 * Bản Android khác một chỗ, và chỗ ấy đủ sức làm hỏng việc trong im lặng:
 *
 *   - Màn học ở đây là một VIEW chứ không phải lớp phủ như bên extension, nên
 *     phải show("Study") rồi mới dọn phần chờ. Thiếu bước ấy thì buổi học dựng
 *     xong mà màn hình vẫn đứng nguyên ở sổ tay.
 *
 * @param {string[]} ds tên các đường sẽ ôn, theo đúng thứ tự
 */
async function hocRieng(it, ds) {
  session = { queue: ds.map((d) => Object.assign({}, it, { _d: d })),
              done: 0, again: 0, deleted: 0, rieng: it.key };
  lastDeleted = null;
  show("Study");
  $("stUndo").style.display = "none";
  $("stIdle").style.display = "none";
  $("stBody").style.display = "";
  $("stStart").style.display = "none";
  batNhacTau();
  showCard();
}

/**
 * Dòng tiến trình trên mặt thẻ học.
 *
 * Tách ra thành hàm riêng vì có hai chỗ cần vẽ nó: lúc đổi thẻ, và lúc chạm
 * "Tắt mạng nghĩa" ngay trên thẻ — tắt là trọng số chia lại nên ĐIỂM ĐỔI NGAY,
 * mà con số cũ nằm nguyên đó thì trông như nút không ăn.
 */
function veTienTrinh(it) {
  /*
   * Nói luôn ĐANG KIỂM ĐƯỜNG NÀO và từ này đang được mấy điểm.
   *
   * Từ khi mỗi đường một lịch riêng, cùng một từ có thể hiện ra dưới bốn kiểu
   * đề khác nhau. Không nói ra thì người học gặp đề nghe của một từ mình vừa
   * làm đề nhìn hôm qua và tưởng app hỏi lặp. Còn con số điểm thì đây là chỗ
   * nó cần có mặt nhất: ngay lúc người ta đang bỏ công ra làm cho nó lên.
   */
  const dTu = window.Srs.diemTu(it);
  $("stProg").textContent =
    T2("Còn {n} mục · đã xong {xong}", { n: session.queue.length, xong: session.done })
    + "\u3000·\u3000" + T(window.Srs.TEN_DUONG[it._d || "nhin"] || "")
    + "\u3000·\u3000" + dTu.tong + "/100"
    // Không nói ra thì gặp một từ CHƯA tới hạn, người học tưởng app hỏi lặp.
    // Mốc là `_cum` chứ không phải `_som` nữa: thẻ này tới hạn của CHÍNH NÓ,
    // cụm chỉ đổi chỗ đứng chứ không thêm lượt ôn nào — gọi là "ôn kèm" thì
    // nói quá điều app vừa làm.
    + (it._cum ? "\u3000·\u3000" + T2("cùng cụm với {t}", { t: it._cum }) : "");
}

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

  /*
   * Hai công tắc rút bớt việc cũng nằm ở đây, vì ĐÂY MỚI LÀ LÚC NGHĨ RA.
   *
   * "Mấy từ đồng nghĩa này chẳng dính gì tới từ gốc" và "từ này mình thuộc hẳn
   * rồi" đều là ý nảy ra giữa buổi học, khi đang nhìn chính cái thẻ ấy. Bắt người
   * ta nhớ để lát nữa vào sổ tay tìm lại thì chẳng ai làm.
   */
  const co = (ten, iconTen, bat, chu, chuBat) => {
    const b = el("button", "btn sm" + (bat ? " tinted" : ""));
    b.type = "button";
    b.innerHTML = window.Icon(iconTen, { size: 17, weight: bat ? "solid" : "line" });
    b.appendChild(el("span", "lb", bat ? chuBat : chu));
    b.addEventListener("click", async () => {
      if (await datCo(it.key, ten, !bat)) it[ten] = 1; else delete it[ten];
      renderStudyFav(it);
      veTienTrinh(it);
    });
    return b;
  };
  box.appendChild(co("dongBang", "snowflake", !!it.dongBang,
    T("Đóng băng"), T("Đang đóng băng")));
  box.appendChild(co("mangTat", "graph", !!it.mangTat,
    T("Tắt mạng nghĩa"), T("Mạng nghĩa đã tắt")));
}

/** @param {boolean} giuLat  true = vẽ lại thẻ nhưng giữ nguyên trạng thái đã lật */
/* ==================================================================== */
/* Nhịp đọc & lời nhắc tập trung                                        */
/* ==================================================================== */

/** Mặc định; xem nhip-doc.js về việc cụm là gì và vì sao cần nhịp. */
const NHIP_MAC_DINH = { nhip: true, nhipToc: 320, nhacPhut: 0, coVu: true, nhacTau: true, tach: true, onCum: true };
let CAI_NHIP = Object.assign({}, NHIP_MAC_DINH);

function nhipTocHopLe(v) {
  const n = parseInt(v, 10);
  if (!n) return NHIP_MAC_DINH.nhipToc;
  return Math.max(window.NhipDoc.TOC_MIN, Math.min(window.NhipDoc.TOC_MAX, n));
}

/** Chạy nhịp trên câu ở mặt trước thẻ, nếu người dùng có bật. */
function batNhip() {
  if (!window.NhipDoc) return 0;
  if (CAI_NHIP.nhip === false) { window.NhipDoc.dung(); return 0; }
  // Câu trước, nghĩa sau — đúng thứ tự mắt cần đi.
  return window.NhipDoc.batDau([$("stWord"), $("stMean")], { toc: nhipTocHopLe(CAI_NHIP.nhipToc) });
}

/**
 * Hẹn lại đồng hồ nhắc tập trung. Mốc đếm tính từ lúc gọi — tức là từ lúc mở
 * app, và từ lúc bấm Lưu nếu vừa đổi số phút.
 */
function datLoiNhac() {
  if (!window.NhipDoc) return;
  window.NhipDoc.datNhac(CAI_NHIP.nhacPhut, () => {
    const ngu = laNhat() ? "ja" : "en";
    const chu = window.NhipDoc.loiNhac(ngu);
    speak(chu, null, ngu);
    // Kèm một dòng chữ: tai nghe đang rút, hay máy không có giọng thứ tiếng
    // đó, thì ít ra mắt vẫn nhận được lời nhắc.
    toast(chu);
  });
}

// Tiếng tách khi bấm nút: gắn MỘT người nghe cho cả trang, hỏi lại cài đặt ở
// từng lượt bấm. Gắn từng nút một thì mỗi nút mới dựng ra sau này lại câm.
if (window.CoVu) window.CoVu.ngheNut(document, () => CAI_NHIP.tach !== false);

/**
 * Hẹn nhạc ga tàu cho buổi học. Xem nhac-tau.js về việc vì sao thưa và ngẫu nhiên.
 *
 * `duoc()` được hỏi lại ở TỪNG lượt chứ không chỉ lúc bật: người ta có thể đã
 * sang màn khác, đóng buổi học, hay tắt màn hình — lúc đó nhạc vang lên là quấy rầy.
 */
function batNhacTau() {
  if (!window.NhacTau) return;
  if (CAI_NHIP.nhacTau === false) { window.NhacTau.tat(); return; }
  window.NhacTau.bat({
    duoc: () => manHienTai === "Study" && $("stBody").style.display !== "none" && !document.hidden
  });
}

/**
 * Cổ vũ một lượt chấm: tiếng chuông ngay, câu nói sau một nhịp ngắn.
 *
 * Gọi TRƯỚC mọi thứ khác trong grade() và không `await`: người ta bấm là muốn
 * nghe ngay, chờ ghi sổ với đồng bộ xong mới kêu thì tiếng lạc hẳn khỏi cái bấm.
 */
function coVu(nho) {
  if (!window.CoVu || CAI_NHIP.coVu === false) return;
  window.CoVu.chuong(nho);
  const ngu = laNhat() ? "ja" : "en";
  setTimeout(() => speak(window.CoVu.loi(nho, ngu), null, ngu, { rate: 1.02, pitch: 1.12 }),
             window.CoVu.CHO_NOI);
}

async function napNhip() {
  CAI_NHIP = Object.assign({}, NHIP_MAC_DINH, (await Store.get("nhip")) || {});
  if ($("setOnCum")) $("setOnCum").checked = CAI_NHIP.onCum !== false;
  if ($("setNhip")) $("setNhip").checked = CAI_NHIP.nhip !== false;
  if ($("setNhipToc")) $("setNhipToc").value = CAI_NHIP.nhipToc || NHIP_MAC_DINH.nhipToc;
  if ($("setNhac")) $("setNhac").value = CAI_NHIP.nhacPhut || 0;
  if ($("setCoVu")) $("setCoVu").checked = CAI_NHIP.coVu !== false;
  if ($("setNhacTau")) $("setNhacTau").checked = CAI_NHIP.nhacTau !== false;
  if ($("setTach")) $("setTach").checked = CAI_NHIP.tach !== false;
  datLoiNhac();
}

async function luuNhip() {
  await Store.set("nhip", {
    onCum: $("setOnCum") ? $("setOnCum").checked : true,
    nhip: $("setNhip").checked,
    nhipToc: nhipTocHopLe($("setNhipToc").value),
    nhacPhut: Math.max(0, Math.min(240, parseInt($("setNhac").value, 10) || 0)),
    coVu: $("setCoVu").checked,
    nhacTau: $("setNhacTau").checked,
    tach: $("setTach").checked
  });
  await napNhip();
  $("nhipStatus").textContent = T("Đã lưu.");
}
if ($("saveNhip")) $("saveNhip").addEventListener("click", luuNhip);
// Nghe thử: chỉnh âm lượng loa cho vừa tai TRƯỚC khi vào học, chứ đang học mà
// nhạc vang to quá thì lúc mò nút đã mất mạch rồi.
if ($("nghThu")) $("nghThu").addEventListener("click", () => {
  const t = window.NhacTau && window.NhacTau.phatMot();
  if (t) $("nhipStatus").textContent = T2("Đang phát: nhạc ga {ten}", { ten: t.ten });
});

/*
 * Bấm giờ truy xuất — đo từ lúc thẻ hiện ra tới lúc bấm Nhớ. Quãng này gồm cả
 * thời gian ĐỌC đáp án sau khi lật, nên nó là thời gian truy xuất cộng một hằng
 * số; muốn tín hiệu sạch hơn thì đo tới lúc bấm "Hiện nghĩa".
 */
let mocHienThe = 0;
/**
 * Đồng hồ đã DỪNG ở mốc này (ms). null = đang chạy bình thường.
 *
 * `ms` sinh ra để đo THỌI GIAN TRUY XUẤT — mất bao lâu để moi từ ra khỏi đầu.
 * Mở nguồn ra đọc lại câu gốc, hay sang Gemini hỏi, thì đó không còn là truy
 * xuất nữa — mà đồng hồ thì vẫn chạy. Đọc năm phút rồi bấm Nhớ là lượt ấy
 * được ghi "rất chậm" (`MS_TOI_DA` kẹp ở 60 giây), và `T_NET.rat_cham = 0,85` thì
 * giãn cách CO LẠI — bị phạt vì đã chịu khó đi đọc lại.
 *
 * Dừng HẲN tại lúc rời thẻ chứ không tạm dừng rồi chạy tiếp: quay lại thì đã
 * nhìn thấy ngữ cảnh rồi, phần sau đó cũng chẳng đo được gì nữa.
 */
let msDaDung = null;

/** Dừng đồng hồ ngay tại đây. Gọi nhiều lần thì giữ mốc ĐẦU TIÊN. */
function dungDongHo() {
  if (msDaDung !== null) return;
  if (mocHienThe) msDaDung = Math.round(performance.now() - mocHienThe);
  else if (baiLien && baiLien.moc) msDaDung = Math.round(performance.now() - baiLien.moc);
}

/**
 * Thẻ ĐANG HIỆN TRÊN MÀN — không phải đầu hàng đợi. Hai thứ đó lệch nhau đúng
 * từ lúc bấm Nhớ (đã rút thẻ khỏi hàng) tới lúc vẽ thẻ kế; trong khoảng đó cửa
 * sổ "nghe lại nguồn?" đang mở, mặt thẻ vẫn là từ vừa chấm, mà mấy nút Sửa /
 * Ghi chú / loa / Xoá lại đọc đầu hàng, tức là từ KẾ TIẾP.
 */
let theTrenMan = null;
function theCardHienTai() { return theTrenMan || session.queue[0]; }

function showCard(giuLat) {
  if (window.NhipDoc) window.NhipDoc.dung();   // thẻ mới: nhịp của thẻ cũ phải tắt
  const it = session.queue[0];
  theTrenMan = it;
  if (!it) { finishStudy(); return; }
  const daLat = giuLat && $("stGrade").style.display !== "none";
  mocHienThe = performance.now();
  msDaDung = null;

  const laNghe = it._d === "nghe";
  const laLien = it._d === "dong" || it._d === "trai";
  $("stNgheMat").style.display = laNghe ? "" : "none";
  $("stLienMat").style.display = laLien ? "" : "none";
  /*
   * Rời khỏi bài liên kết thì dọn sạch màn kết quả của nó.
   *
   * `veBaiLien` cũng dọn, nhưng chỉ chạy khi thẻ SAU lại là một bài liên kết
   * nữa. Thẻ sau là thẻ thường thì lớp `kq` và nút Tiếp nằm lại — ẩn theo
   * `#stLienMat` nên không ai thấy, tới lúc gặp bài liên kết kế tiếp mới lòi
   * ra: khung đã mang sẵn bố cục danh sách trước khi có gì để bày.
   */
  if (!laLien) {
    $("stLienO").classList.remove("kq");
    $("stLienTiep").style.display = "none";
    tiepBaiLien = null;
  }
  $("stMatChu").style.display = laNghe ? "none" : "";
  $("stNgheCau").style.display = "none";
  $("stNgheCau").textContent = "";
  if (laNghe) {
    const lv = ((it.duong || {}).nghe || {}).lv;
    $("stNgheToc").textContent = T2("Tốc độ ×{t} — nhanh dần theo cấp", { t: window.Srs.tocDoNghe(lv) });
  }
  if (laLien) veBaiLien(it);

  veTienTrinh(it);
  $("stCard").className = "studycard" + (it.kind === "sent" ? " sent" : "") + (it.dict === "kanji" ? " kanji" : "");
  $("stWord").textContent = it.word;
  $("stWord").className = "cw" + (laNhat() ? " ja" : "");
  renderStudyFav(it);

  const src = $("stSrc");
  if (it.src && it.src.url) { src.style.display = ""; src.onclick = () => openSourceExt(it); }
  else { src.style.display = "none"; src.onclick = null; }

  // Cụm ghi âm dùng CHÍNH khoá của mục, nên bản thu ghi ở sổ tay thì mở buổi
  // học ra là nghe lại được ngay.
  const oGhi = $("stGhiAm");
  if (oGhi) { oGhi.textContent = ""; oGhi.appendChild(cumGhiAm(it.key)); }

  $("stRead").textContent = "";
  $("stMean").innerHTML = "";
  $("stMyNote").innerHTML = "";
  $("stReveal").style.display = laLien ? "none" : "";
  $("stGrade").style.display = "none";
  // Thẻ nghe tự phát một lượt ngay: bắt bấm thêm một nút nữa mới nghe là thừa.
  //
  // Nhớ lại hẹn giờ để HUỶ nó ở thẻ sau: bấm Nhớ trong vòng 120ms kể từ lúc thẻ
  // hiện ra thì hẹn cũ nổ trên thẻ mới, và người ta nghe câu của từ trước.
  if (henPhat) { clearTimeout(henPhat); henPhat = null; }
  if (laNghe && !daLat) henPhat = setTimeout(() => { henPhat = null; phatCauNghe(); }, 120);
  if (daLat) revealCard();
}

/* ==================================================================== */
/* Bồi thêm sau khi lưu: câu ngữ cảnh và tập từ liên                    */
/* ==================================================================== */
/*
 * Cả hai đều phải gọi mạng, nên chạy SAU khi đã lưu và KHÔNG chờ — cùng nếp với
 * việc ghép furigana. Bấm Lưu thì phải lưu xong ngay; bắt nút Lưu đứng chờ một
 * lượt hỏi mạng chỉ để làm đẹp dữ liệu là đổi một thứ chắc chắn lấy một thứ hên
 * xui. Ghi qua `capNhat` nên chúng tự xếp hàng, không giẫm lên nhau.
 */
async function boiThem(key) {
  try {
    const nb = await getNB();
    const e = nb[key];
    if (!e || e.del) return;
    const laJa = String(e.dict || "").indexOf("ja") === 0;

    if (!e.cauNghe) {
      const c = window.CauNghe.tuNguon(e.src, e.word);
      if (c) {
        let dich = "";
        try { dich = await gtxTranslate(c.cau, laJa ? "ja" : "en", "vi"); } catch (er) { dich = ""; }
        if (dich && dich.trim() === c.cau.trim()) dich = "";
        await capNhat((n2) => {
          const x = n2[key];
          if (!x || x.del || x.cauNghe) return;
          n2[key] = Object.assign({}, x, { cauNghe: { cau: c.cau, dich: dich, ts: Date.now() } });
        });
      }
    }

    if (!e.lien) {
      /*
       * Mục DẪN XUẤT: thu tập liên kết về đúng tập ban đầu, và KHÔNG gọi mạng.
       *
       * Không gọi mạng ở đây không phải để tiết kiệm. Vòng dịch-ngược dưới đây
       * chính là cỗ máy đẻ từ mới: nó trả về cả danh sách ứng viên cho cùng một
       * ý. Mà ở đây chỉ cần biết mấy từ SẴN CÓ trong tập của gốc có được xác
       * nhận hay không — bảng hạt giống và 日本語WordNet nằm ngay trong máy đã
       * trả lời được. Gọi mạng vừa chậm vừa đi ngược điều đang muốn.
       */
      const laDanXuat = !!(e.tuCum && e.tuCum.goc);
      // Nạp đúng mảnh 日本語WordNet chứa từ này. Chỉ mảnh đó, và chỉ một lần.
      if (laJa) await window.TuLien.napBo(e.word, (i) => "tu-lien/" + i + ".txt");
      let ra = window.TuLien.tuBang(e.word);
      if (laJa && !ra.dong.length && !laDanXuat) {
        // Không có API 類語 nào cho gọi từ trình duyệt. Nhưng dịch sang tiếng
        // Việt rồi dịch NGƯỢC lại thì Google trả về cả danh sách ứng viên cho
        // cùng một ý — đó chính là tập đồng nghĩa.
        try {
          const g1 = await gtxDict(e.word, "ja", "vi");
          if (g1 && g1.main) {
            const g2 = await gtxDict(g1.main, "vi", "ja");
            let ds = [];
            for (const t of (g2 && g2.senses) || []) ds = ds.concat(t.terms || []);
            if (g2 && g2.main) ds.unshift(g2.main);
            ra = window.TuLien.gop(ra, { dong: window.TuLien.gonDs(ds, e.word), trai: [] });
          }
        } catch (er) { /* thôi vậy */ }
      } else if (!laJa) {
        ra = window.TuLien.gop(window.TuLien.tuPos(e.pos, e.word), ra);
      }
      if (laDanXuat) {
        // Tìm mục gốc theo CON CHỮ, không theo khoá: khoá mang tiền tố hướng
        // tra, mà từ dẫn xuất có thể lưu ở hướng khác với gốc.
        let goc = null;
        for (const k in nb) {
          const x = nb[k];
          if (x && !x.del && x.word === e.tuCum.goc) { goc = x; break; }
        }
        // Gốc đã bị xoá thì vốn chỉ còn chính nó — vẫn đúng tinh thần: không
        // rước thêm từ nào mới vào.
        ra = window.TuLien.locTheoCum(ra, e.word, goc || { word: e.tuCum.goc }, e.tuCum.ben);
      }
      // Những từ người học đã tự tay bỏ thì đừng dựng lại. Lọc ở chỗ DỰNG chứ
      // không ở chỗ đọc — quên một màn là từ đã bỏ lại hiện ra.
      ra = window.TuLien.locBo(ra, e.lienBo);
      if (ra.dong.length || ra.trai.length) {
        await capNhat((n2) => {
          const x = n2[key];
          if (!x || x.del || x.lien) return;
          n2[key] = Object.assign({}, x, { lien: { dong: ra.dong, trai: ra.trai, ts: Date.now() } });
        });
      }
    }
  } catch (er) { /* không bồi được thì mục vẫn dùng bình thường */ }
}

/* ==================================================================== */
/* Cửa sổ 5 giây: quay lại nguồn nghe lại                               */
/* ==================================================================== */
/*
 * CỬA SỔ "MỞ LẠI NGUỒN NGHE LẠI?" ĐÃ BỊ GỠ HẲN.
 *
 * Nó từng chặn giữa hai thẻ: chấm xong một từ là hiện ra một câu hỏi kèm đếm
 * ngược ba giây. Ý định là "một cái cửa mở hé", nhưng đặt giữa mạch ôn thì nó
 * là một cái chắn: mỗi thẻ có nguồn đều phải bấm thêm một lần để đi tiếp, hoặc
 * ngồi đợi ba giây. Một buổi trăm thẻ là trăm lần như thế.
 *
 * Nút "Mở nguồn" vẫn nằm ngay trên mặt thẻ — cái cửa không mất, chỉ thôi tự
 * chìa ra trước mặt. Phần đáng lo của việc đi đọc nguồn — bị chấm là "rất
 * chậm" — nay do `dungDongHo` lo.
 */

/**
 * Phát câu nghe. Tốc độ theo cấp của chính đường nghe — cấp thấp nghe chậm cho
 * rõ từng chữ, lên cấp thì đẩy về tốc độ nói thật.
 */
let henPhat = null;

function phatCauNghe() {
  const it = theCardHienTai();
  if (!it || !it.cauNghe || !it.cauNghe.cau) return;
  const lv = ((it.duong || {}).nghe || {}).lv;
  speak(it.cauNghe.cau, null, laNhat() ? "ja" : "en", { rate: window.Srs.tocDoNghe(lv) });
}
if ($("stNghePhat")) $("stNghePhat").addEventListener("click", phatCauNghe);

/* ==================================================================== */
/* Bài liên kết: nhặt cho hết tập đồng nghĩa / trái nghĩa               */
/* ==================================================================== */
/*
 * Não cất từ theo LÁNG GIỀNG chứ không theo khoá: muốn nói "cải thiện" thì
 * 改善 / 改良 / 向上 / 進歩 cùng sáng lên rồi tranh nhau. Biết từ mà vẫn nói
 * nhầm từ không phải vì quên, mà vì chọn sai giữa mấy ứng viên gần nhau — thẻ
 * từ đơn không luyện được chuyện đó vì nó giả vờ mỗi từ đứng một mình.
 */
/* ==================================================================== */
/* Màn KẾT QUẢ của bài liên kết                                         */
/* ==================================================================== */

/**
 * NGHĨA của một mớ từ, để điền vào màn kết quả.
 *
 * Bên extension việc này nằm ở nền (`background.js`, NGHIA_DS); bên này không
 * có nền nên phải tự làm. Ba điều giữ nguyên vì chúng là lý do bản kia chạy
 * được:
 *
 *   - CHẠY SONG SONG. Một đề có tới 16 ô; làm nối đuôi thì người học ngồi nhìn
 *     màn hình trống mất chục giây.
 *   - CÓ ĐỆM theo từ, nên đề sau gặp lại từ cũ là có ngay.
 *   - Hụt một từ thì mất một dòng, KHÔNG giữ cả bảng lại chờ nó.
 */
const nghiaDem = new Map();
async function nghiaDs(ds) {
  const ra = {};
  const list = Array.from(new Set((ds || []).filter(Boolean))).slice(0, 20);
  await Promise.all(list.map(async (w) => {
    if (nghiaDem.has(w)) { ra[w] = nghiaDem.get(w); return; }
    let m = "";
    try {
      if (NGU === "ja") {
        const e = (await fetchMazii(w).catch(() => [])).find((x) => x && x.word === w);
        if (e && e.means && e.means.length) m = meanToStr(e.means[0]);
      }
      if (!m) m = await gtxTranslate(w, NGU === "ja" ? "ja" : "en", "vi");
    } catch (e) { m = ""; }
    m = String(m || "").trim();
    if (m) nghiaDem.set(w, m);
    ra[w] = m;
  }));
  return ra;
}

/**
 * Lưu một từ vào sổ chỉ với con chữ — tra rồi lưu, gộp trong một lượt.
 *
 * Dùng cho mấy nút Lưu trên màn kết quả: ở đó ta chỉ có mỗi con chữ, mà lưu
 * trơ con chữ thì mục vào sổ không có cách đọc lẫn nghĩa — tức là một thẻ
 * không học được.
 *
 * Tra không ra thì VẪN lưu con chữ. Người học vừa nhìn thấy nó trong một bài
 * họ đang làm, nên nó đáng vào sổ; `boiThem` và `rubyVaSau` chạy ngầm ngay sau
 * đó sẽ vá dần phần còn thiếu.
 */
/**
 * @param {{goc:string, ben:"dong"|"trai"}} [cum] từ này lưu ra từ tập
 *   đồng/trái nghĩa của từ nào. Có nó thì mục thành từ DẪN XUẤT: `boiThem`
 *   thu tập liên kết của nó về đúng tập ban đầu.
 */
async function luuNhanhTu(word, dict, cum) {
  const w = String(word || "").trim();
  if (!w) throw new Error(T("Thiếu từ"));
  const d = dict || "javi";
  const key = d + ":" + w;
  let en = null;
  try {
    const ds = await lookup(w, d);
    // Mazii trả cả kết quả gần đúng — phải lấy đúng con chữ đang hỏi, không
    // thì lưu nhầm một từ khác mang nghĩa của nó.
    en = (ds || []).find((x) => x && x.word === w) || null;
  } catch (e) { en = null; }
  if (!en) en = { word: w, reading: "", means: [] };

  await capNhat((nb) => {
    const cu = nb[key];
    const ne = { word: w, reading: en.reading || "", means: en.means || [], dict: d, ts: Date.now() };
    if (cum && cum.goc) ne.tuCum = { goc: String(cum.goc), ben: cum.ben === "trai" ? "trai" : "dong" };
    if (en.docSuy) ne.docSuy = 1;
    if (en.audio) ne.audio = en.audio;
    if (en.pos && en.pos.length) ne.pos = en.pos;
    // Lưu lại một mục đã có thì GIỮ mọi thứ người học đã tự làm — giống hệt
    // nhánh lưu ở màn tra. Nút này hiện ra là "+ Lưu" nên gần như luôn là mục
    // mới, nhưng "gần như" không phải "luôn": hai đề có thể chạy sát nhau.
    if (cu && !cu.del) {
      if (cu.deck) ne.deck = cu.deck;
      if (cu.srs) ne.srs = cu.srs;
      if (cu.duong) ne.duong = cu.duong;
      if (cu.cauNghe) ne.cauNghe = cu.cauNghe;
      if (cu.lien) ne.lien = cu.lien;
      if (cu.kind) ne.kind = cu.kind;
      if (cu.fav) ne.fav = cu.fav;
      if (cu.note) ne.note = cu.note;
      if (cu.hoiAi) ne.hoiAi = cu.hoiAi;
      if (cu.lienBo) ne.lienBo = cu.lienBo;
      if (cu.mangTat) ne.mangTat = 1;
      if (cu.dongBang) ne.dongBang = 1;
      if (cu.tuCum && !ne.tuCum) ne.tuCum = cu.tuCum;
      if (cu.src) ne.src = cu.src;
      if (cu.audio && !ne.audio) ne.audio = cu.audio;
      if (cu.ruby) { ne.ruby = cu.ruby; if (cu.docSuy) ne.docSuy = 1; }
      if (cu.mEdit) { ne.mEdit = 1; ne.means = cu.means; ne.mOrig = cu.mOrig; }
    }
    window.Muc.nhatLaiBanSua(ne, cu);
    nb[key] = ne;
  });
  // Vá phần còn thiếu ở nền, KHÔNG chờ: người học đang đứng giữa buổi học.
  if ((d === "javi" || d === "vija") && !en.reading) rubyVaSau(key, w).catch(() => {});
  boiThem(key);
  syncSoon();
  return key;
}

/**
 * Một hàng của màn kết quả: con chữ, chỗ chờ điền nghĩa, và nút Lưu.
 *
 * Tách ra khỏi vòng lặp để ba nhóm dùng chung đúng một cách dựng hàng — chia
 * nhóm là việc của thứ tự, không được đẻ thêm ba biến thể của cùng một hàng.
 *
 * Và một nút BỎ, cho đúng những từ THẬT SỰ nằm trong tập liên kết của từ đang
 * học. Đây mới là lúc người ta biết một liên kết là vô lý — đang nhìn
 * "茶寮 = căn nhà làm nghi lễ trà đạo" nằm trong đáp án của 飲食店. Bắt nhớ để
 * lát nữa về sổ tay dò lại thì vừa mất công vừa khó soi, mà phần lớn là quên.
 *
 * XÉT THEO `lien`, KHÔNG THEO NHÓM. Nhóm "Đáp án" đúng là tập liên kết của cực
 * đang kiểm, nhưng `veBaiLien` lấy nhiễu GẦN từ chính cực KIA — nên một từ nằm
 * dưới "Từ nhiễu" vẫn có thể là liên kết thật, chỉ là ở cực ngược lại. Xét theo
 * nhóm thì đúng mấy từ ấy lại không bỏ được.
 *
 * Bỏ rồi thì LÀM MỜ chứ không gỡ hàng đi: màn này là bản ghi của bài vừa làm,
 * hàng biến mất giữa lúc đang đọc thì mất cả chỗ đang nhìn. Và `boTuLien` gọi
 * ngược lại qua `khiDoi` nên bấm Hoàn tác là hàng sáng lại.
 */
function hangLien(chu, b) {
  const hang = el("div", "lien-hang");
  const nhan = el("div", "lien-tu", chu);
  if (b.chon.has(chu)) nhan.classList.add(b.dung.has(chu) ? "dung" : "sai");
  else if (b.dung.has(chu)) nhan.classList.add("sot");
  hang.appendChild(nhan);

  const ngh = el("div", "lien-nghia muted", "…");
  hang.appendChild(ngh);

  // Từ đang học thì khỏi bày nút Lưu — nó đã ở trong sổ rồi.
  const daCo = tuDaLuu.has(chu);
  const nut = el("button", "chip nho", daCo ? T("Đã có") : T("+ Lưu"));
  nut.type = "button";
  nut.disabled = daCo;
  nut.addEventListener("click", async () => {
    nut.disabled = true;
    nut.textContent = T("Đang lưu…");
    try {
      await luuNhanhTu(chu, NGU === "ja" ? "javi" : "envi", { goc: b.it.word, ben: b.duong });
      nut.textContent = T("Đã lưu");
      tuDaLuu.add(chu);
      drawNotebook();
      refreshNotifications();
    } catch (e) {
      nut.disabled = false;
      nut.textContent = T("+ Lưu");
      toast(T("Không lưu được từ này"), "bad");
    }
  });
  /*
   * NÃºt Bá» â chá» cho tá»« tháº­t sá»± náº±m trong `lien` cá»§a tá»« Äang há»c.
   */
  const l = (b.it && b.it.lien) || {};
  const laLien = (l.dong || []).indexOf(chu) >= 0 || (l.trai || []).indexOf(chu) >= 0;
  if (laLien) {
    const xo = el("button", "lien-bo", "×");
    xo.type = "button";
    xo.title = T2("Bỏ “{tu}” khỏi liên kết của “{goc}”", { tu: chu, goc: b.it.word });
    xo.addEventListener("click", () => {
      xo.disabled = true;
      boTuLien(b.it, chu, (daBo) => {
        hang.classList.toggle("bo", daBo);
        xo.disabled = false;
        xo.textContent = daBo ? "↺" : "×";
        xo.title = daBo
          ? T2("Nhận lại “{tu}” vào liên kết", { tu: chu })
          : T2("Bỏ “{tu}” khỏi liên kết của “{goc}”", { tu: chu, goc: b.it.word });
      });
    });
    hang.appendChild(xo);
  }
  hang.appendChild(nut);
  return { chu: chu, o: ngh, hang: hang };
}

/**
 * Màn KẾT QUẢ của bài liên kết.
 *
 * Ba thứ, và cả ba đều chỉ có giá trị ĐÚNG LÚC NÀY:
 *   - đúng hay sai từng ô: xanh = nhặt đúng, gạch đỏ = nhặt nhầm, viền đứt =
 *     BỎ SÓT. Bỏ sót mới là thứ đáng nhìn lại nhất nên nó có dấu riêng.
 *   - NGHĨA của từng từ. Một chùm chữ Hán trơ thì nhìn xong quên ngay; có
 *     nghĩa kèm thì cả chùm mới thành một cụm liên kết trong đầu.
 *   - nút LƯU từng từ. Gặp một từ hay ngay trong lúc học mà phải nhớ để lát
 *     nữa đi tra lại thì chẳng ai làm.
 */
function veKetQuaLien(b, dung, ms) {
  const khung = $("stLienO");
  const ds = [];
  khung.textContent = "";
  khung.classList.remove("to");
  khung.classList.add("kq");

  // Quy tắc xếp nhóm nằm ở tu-lien.js, dùng chung với bản extension.
  const nhom = window.TuLien.xepKetQua(b);

  const veNhom = (ten, cls, ds2) => {
    if (!ds2.length) return;                      // nhóm rỗng thì bỏ hẳn tiêu đề
    const h = el("div", "lien-nhom" + (cls ? " " + cls : ""));
    h.appendChild(el("span", null, ten));
    h.appendChild(el("span", "dem", "(" + ds2.length + ")"));
    khung.appendChild(h);
    for (const chu of ds2) {
      const r = hangLien(chu, b);
      khung.appendChild(r.hang);
      ds.push(r);
    }
  };
  /*
   * NHÃN NHÓM BA PHẢI NÓI ĐÚNG CHÚNG LÀ GÌ.
   *
   * Từ khi đề chỉ lấy từ của chính từ đang học, những ô còn lại KHÔNG còn là
   * "từ nhiễu" nữa — chúng là CỰC NGƯỢC LẠI của chính nó. Gọi là nhiễu thì vừa
   * sai, vừa bỏ phí đúng cái đáng học nhất ở đây: "mấy từ này không phải đáp án
   * vì chúng là trái nghĩa" — đó mới là bài học của lượt vừa rồi.
   */
  const nhanCuc = b.duong === "dong" ? T("Trái nghĩa của từ này") : T("Cùng nghĩa của từ này");
  veNhom(T("Đáp án"), "dap", nhom.dapAn);
  veNhom(T("Nhặt nhầm"), "nham", nhom.nhatNham);
  veNhom(nhanCuc, "", nhom.nhieu);

  $("stLienXong").style.display = "none";
  $("stLienKq").textContent = T2("Nhặt được {a}/{b} · {t} giây",
    { a: dung, b: b.dung.size, t: Math.round(ms / 100) / 10 });

  /*
   * NGHĨA: lấy trong SỔ TAY trước, chỉ phần còn thiếu mới đi hỏi mạng.
   *
   * Phần lớn ô trên màn kết quả là từ đã nằm trong sổ — nút của chúng ghi "Đã
   * có". Nghĩa của chúng nằm sẵn ngay trong máy, hiện ra tức thì và không bao
   * giờ hụt. Hỏi mạng cho cả bảng thì mạng chập một cái là trắng trơn cả màn,
   * mà trên điện thoại thì mạng chập là chuyện thường ngày.
   */
  const soTay = new Map();
  for (const x of mucDaLuu) {
    if (!x || x.del || !x.word) continue;
    const n = (x.means || []).map(meanToStr).filter(Boolean)[0];
    if (n && !soTay.has(x.word)) soTay.set(x.word, n);
  }
  dienNghia(ds, soTay);
}

/**
 * Điền nghĩa vào một loạt ô — dùng chung cho cả màn LÀM BÀI lẫn màn KẾT QUẢ.
 *
 * Lấy trong SỔ TAY trước, chỉ phần còn thiếu mới đi hỏi mạng. Phần lớn ô là từ đã
 * nằm trong sổ — nghĩa của chúng nằm sẵn trong máy, hiện tức thì và không hụt.
 *
 * @param {Array<{chu:string, o:HTMLElement}>} ds
 * @param {Map<string,string>} [co] bảng nghĩa đã dựng sẵn; không có thì tự dựng.
 */
function dienNghia(ds, co) {
  if (!ds.length) return;
  let soTay = co;
  if (!soTay) {
    soTay = new Map();
    for (const x of mucDaLuu) {
      if (x.del || !x.word) continue;
      const n = (x.means || []).map(meanToStr).filter(Boolean)[0];
      if (n && !soTay.has(x.word)) soTay.set(x.word, n);
    }
  }
  const thieu = [];
  for (const x of ds) {
    const n = soTay.get(x.chu);
    if (n) x.o.textContent = n; else thieu.push(x);
  }
  if (!thieu.length) return;
  nghiaDs(thieu.map((x) => x.chu)).then(
    (co2) => { for (const x of thieu) x.o.textContent = co2[x.chu] || "—"; },
    () => { for (const x of thieu) x.o.textContent = "—"; });
}

/** Việc sẽ làm khi bấm Tiếp. null = đang không ở màn kết quả. */
let tiepBaiLien = null;

let baiLien = null;

function veBaiLien(it) {
  const d = it._d;
  const l = it.lien || {};
  const dung = (d === "dong" ? l.dong : l.trai) || [];
  const kia = (d === "dong" ? l.trai : l.dong) || [];
  /*
   * ĐỀ CHỈ LẤY TỪ CHÍNH TỪ ĐANG HỌC — không rước từ ngoài vào nữa.
   *
   * Trước đây nhiễu lấy cả từ sổ tay cho "quen mắt". Nghe xuôi, nhưng nó biến
   * một bài đáng lẽ là "phân biệt đồng với trái nghĩa của chính từ này" thành
   * "đãi mười sáu từ chẳng dính gì nhau" — dài, mệt, và phần khó nằm ở chỗ đọc
   * cho hết chứ không ở chỗ nhớ.
   *
   * Từ nào không có cực kia thì bày toàn đáp án — bấm hết là đúng, đúng như
   * người dùng chọn: lúc ấy nó thành một lượt ÔN chứ không còn là bài kiểm tra.
   */
  const o = window.TuLien.dungDe(dung, kia);

  // `o` PHẢI được giữ lại: màn kết quả chia ba nhóm dựa trên đúng danh sách ô
  // đã bày ra, và không có cách nào dựng lại nó (dungDe xáo ngẫu nhiên). Thiếu
  // nó thì `xepKetQua` nhận mảng rỗng và màn kết quả trống trơn.
  baiLien = { it: it, duong: d, dung: new Set(dung), o: o, chon: new Set(), moc: performance.now() };
  msDaDung = null;
  $("stLienDe").textContent = d === "dong"
    ? T2("Nhặt cho hết những từ CÙNG NGHĨA với {t}", { t: it.word })
    : T2("Nhặt cho hết những từ TRÁI NGHĨA với {t}", { t: it.word });
  $("stLienKq").textContent = "";
  $("stLienXong").style.display = "";
  // Dọn dấu vết của bài TRƯỚC: lớp `kq` đổi cả bố cục khung, và nút Tiếp còn
  // hiện thì bấm một cái là nhảy mất hai thẻ.
  $("stLienTiep").style.display = "none";
  tiepBaiLien = null;

  const khung = $("stLienO");
  khung.classList.remove("kq");
  khung.textContent = "";
  khung.classList.remove("kq");
  khung.classList.add("to");
  /*
   * MỖI TỪ MỘT Ô LỚN, MỘT CỘT, CHẠM ĐÂU CŨNG ĂN — NHƯNG KHÔNG CÓ NGHĨA.
   *
   * Bản 4.27.0 có in nghĩa tiếng Việt dưới mỗi ô cho "dễ học". Đó là một
   * lỗi thật sự: đề hỏi "nhặt các từ cùng nghĩa với 汁", mà 液体 ghi sẵn "chất
   * lỏng", リキッド ghi "chất lỏng.", 流動体 ghi "chất lỏng" — không cần biết
   * một chữ tiếng Nhật nào, chỉ cần so chuỗi tiếng Việt là xong. Đáp án được in
   * sẵn lên thẻ, nên bài thôi đo cái gì cả.
   *
   * Nghĩa vẫn có — ở MÀN KẾT QUẢ, sau khi đã trả lời. Đó mới đúng chỗ của nó:
   * phần thưởng để đọc, không phải gợi ý để chọn.
   */
  for (const chu of o) {
    const b = el("button", "lien-omot");
    b.type = "button";
    b.appendChild(el("span", "lien-omot-tu" + (laNhat() ? " ja" : ""), chu));
    b.addEventListener("click", () => {
      if (b.disabled) return;
      if (baiLien.chon.has(chu)) { baiLien.chon.delete(chu); b.classList.remove("chon"); }
      else { baiLien.chon.add(chu); b.classList.add("chon"); }
    });
    khung.appendChild(b);
  }
}

async function xongBaiLien() {
  if (!baiLien) return;
  const b = baiLien;
  baiLien = null;                                  // chặn bấm Xong hai lần
  const ms = msDaDung !== null ? msDaDung : Math.round(performance.now() - b.moc);
  msDaDung = null;
  let dung = 0, sai = 0;
  for (const c of b.chon) { if (b.dung.has(c)) dung++; else sai++; }
  const kq = window.TuLien.chamBai({ dung: dung, tong: b.dung.size, sai: sai, ms: ms });

  veKetQuaLien(b, dung, ms);

  coVu(kq.nho);
  session.queue.shift();
  // `kq.diem` là trục thứ hai: nhặt đủ hay nhặt được một nửa. Nó chỉ co giãn
  // cách lại, KHÔNG bị quy thành thời gian rồi thả vào bộ đo nhịp bấm nữa.
  await gradeWord(b.it.key, kq.nho, kq.ms, b.duong, kq.diem);
  if (kq.nho) session.done++; else { session.again++; session.queue.push(Object.assign({}, b.it)); }
  const moi = await theoDoi.ghiLuotOn(kq.nho);
  veChuoiNgay();
  syncSoon();
  /*
   * Sang thẻ kế khi người ta BẤM, không phải sau hai giây.
   *
   * Bản cũ tự nhảy sau 2 giây, hợp lý khi màn kết quả chỉ là một dòng chữ.
   * Giờ nó là một danh sách có nghĩa từng từ và nút lưu — hai giây không đọc
   * nổi, mà tự nhảy giữa lúc đang bấm Lưu thì mất luôn cả thao tác ấy.
   */
  tiepBaiLien = () => {
    tiepBaiLien = null;
    mung(moi, showCard);
  };
  $("stLienTiep").style.display = "";
  $("stLienTiep").focus();
}
if ($("stLienTiep")) $("stLienTiep").addEventListener("click", () => { if (tiepBaiLien) tiepBaiLien(); });
if ($("stLienXong")) $("stLienXong").addEventListener("click", xongBaiLien);

function revealCard() {
  const it = theCardHienTai();
  if (!it) return;
  if (it._d === "nghe") {
    // Lật thẻ nghe: hiện CHỮ của câu vừa nghe + bản dịch.
    $("stMatChu").style.display = "";
    const o = $("stNgheCau");
    o.style.display = "";
    o.innerHTML = "";
    o.appendChild(el("div", "t-lead", (it.cauNghe || {}).cau || ""));
    if ((it.cauNghe || {}).dich) o.appendChild(el("div", "t-small muted", it.cauNghe.dich));
  }
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
  /*
   * Mạng nghĩa hiện ở MẶT SAU, cùng chỗ với nghĩa. Mặt trước thì không được:
   * với hai bài liên kết thì nó chính là đáp án.
   */
  const mangThe = khoiLien(it, false);
  if (mangThe) $("stMean").appendChild(mangThe);
  // Ghi chú riêng chỉ hiện SAU khi lật thẻ — nó thường chứa luôn đáp án.
  $("stMyNote").innerHTML = "";
  if (coGhiChu(it)) $("stMyNote").appendChild(khoiGhiChu((it.note || "").trim(), it.hoiAi));
  if (it.anh && it.anh.length) {
    const hangAnh = el("div", "anh-hang");
    it.anh.forEach((f) => hangAnh.appendChild(oAnh(f, false)));
    $("stMyNote").appendChild(hangAnh);
  }
  $("stReveal").style.display = "none";
  $("stGrade").style.display = "";
  // Chạy nhịp SAU CÙNG: nó bọc cụm cho cả câu lẫn phần nghĩa, nên phải đợi
  // nghĩa được vẽ xong đã.
  batNhip();
}

$("stReveal").addEventListener("click", revealCard);
$("stSpk").addEventListener("click", () => { const it = theCardHienTai(); if (it) speak(it.word, it.audio); });
$("stGemini").addEventListener("click", () => { const it = theCardHienTai(); if (it) moGemini(it); });
$("stEdit").addEventListener("click", () => { const it = theCardHienTai(); if (it) moSua(it, "trans"); });
$("stNote").addEventListener("click", () => { const it = theCardHienTai(); if (it) moSua(it, "note"); });

async function grade(remembered) {
  // Bài liên kết tự chấm bằng nút Xong; đừng để nút Nhớ/Quên cướp lượt.
  if (session.queue[0] && (session.queue[0]._d === "dong" || session.queue[0]._d === "trai")) return;
  // Chấm ĐÚNG thẻ đang hiện trên màn, rồi mới rút nó ra khỏi hàng.
  const it = theCardHienTai();
  if (!it) return;
  const vt = session.queue.indexOf(it);
  if (vt >= 0) session.queue.splice(vt, 1); else session.queue.shift();
  coVu(remembered);
  // Chốt giờ TRƯỚC mọi lượt await: chờ ghi sổ xong mới đo là đo cả tốc độ ổ đĩa.
  const ms = msDaDung !== null ? msDaDung
    : (mocHienThe ? Math.round(performance.now() - mocHienThe) : 0);
  msDaDung = null;
  mocHienThe = 0;
  // Điểm TRƯỚC lượt chấm, để lời báo nói được là nó vừa nhích lên bao nhiêu.
  const truocDiem = window.Srs.diemTu(it).tong;
  await gradeWord(it.key, remembered, ms, it._d || "nhin");
  toast(chuBaoCham(remembered, truocDiem, (await getNB())[it.key], it._d || "nhin"));
  if (remembered) session.done++;
  else { session.again++; session.queue.push(Object.assign({}, it)); }  // quên -> học lại cuối hàng

  // Mọi lượt chấm đều được ghi vào tiến độ, kể cả lượt "quên": công sức bỏ ra là
  // như nhau, mà đếm cả lượt quên mới khuyến khích người ta dám chấm thật.
  const moi = await theoDoi.ghiLuotOn(remembered);
  veChuoiNgay();
  syncSoon();
  // Chờ xem hết chúc mừng rồi mới sang thẻ tiếp — nếu không thì popup che mất
  // thẻ mới và người dùng bấm nhầm.
  // Sau khi NHỚ, mục có nguồn thì hỏi có muốn quay lại nghe không.
  const tiep = () => showCard();
  mung(moi, tiep);
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
  if (window.NhipDoc) window.NhipDoc.dung();
  if (window.NhacTau) window.NhacTau.tat();
  theTrenMan = null;
  $("stBody").style.display = "none";
  $("stIdle").style.display = "";
  $("stStart").style.display = "";
  $("stProg").textContent = "";

  $("stIdleIcon").innerHTML = window.Icon("confetti", { size: 52, weight: "duo" });
  /*
   * Buổi ôn riêng thì tổng kết bằng CHÍNH CON SỐ đã hứa lúc bấm vào chip.
   * Người ta bấm vào "72/100" vì muốn thấy nó nhích lên; báo lại chuỗi ngày và
   * mục tiêu hôm nay là trả lời một câu hỏi khác hẳn câu họ vừa hỏi.
   */
  if (session.rieng) {
    const m = (await getNB())[session.rieng];
    const d = m ? window.Srs.diemTu(m) : null;
    $("stIdleTitle").textContent = T("Xong rồi!");
    $("stIdleSub").textContent = d
      ? T2("{t} giờ được {d}/100 · {b}", { t: m.word, d: d.tong, b: T(d.ten) })
      : T2("Đã ôn {n} bài", { n: session.done });
    session = { queue: [], done: 0, again: 0, deleted: 0 };
    const dueR = await currentDue();
    $("dueCount").textContent = String(dueR.length);
    $("stStart").disabled = dueR.length === 0;
    veChuoiNgay(); syncSoon(); refreshNotifications();
    return;
  }

  const view = await theoDoi.xem();
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
  $("icNhip").innerHTML = window.Icon("lightning", { size: 18 });
  ["cr0", "cr1", "cr2", "cr3", "cr4"].forEach((id) => { $(id).innerHTML = window.Icon("caret-right", { size: 16 }); });
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
  gan("stGemini", "sparkle", "Hỏi Gemini", 15);
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
  gan("saveNhip", "floppy-disk", "Lưu", 15);
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
  ja: [["javi", T("Nhật→Việt")], ["vija", T("Việt→Nhật")]]
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
  if ($("syncChungBat")) {
    const c = (await Store.get("syncChung")) || {};
    $("syncUrlChung").value = c.url || "";
    $("syncTokenChung").value = c.token || "";
    $("syncChungBat").checked = !!c.url;
    veKhoChung();
  }
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
  await napNhip();      // đồng hồ nhắc tập trung đếm từ đây — lúc mở app
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
