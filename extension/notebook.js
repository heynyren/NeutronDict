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
 * @param {string} ma  mã bản thu (dùng khoá của mục, để sổ tay và buổi học
 *   nhìn thấy CÙNG một bản thu)
 * @param {boolean} [giuLau] giữ lâu dài, chỉ người dùng mới xoá được. Trang
 *   Luyện nói dùng cờ này: bản thu ở đó là mốc để vài tuần sau nghe lại xem
 *   mình khá hơn chưa, máy tự dọn sau một ngày là hỏng cả ý nghĩa.
 */
function cumGhiAm(ma, giuLau, mocSua) {
  const cum = el("span", "ghiam");
  let dangThu = null;

  const ve = async () => {
    cum.textContent = "";
    if (!window.GhiAm || !window.GhiAm.hoTro()) return;   // máy không ghi âm được thì đừng bày nút ra

    if (dangThu) {
      const b = nutIcon("stop", T("Dừng ghi"), "dangthu", 16);
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
    const thu = nutIcon("microphone", ban ? T("Ghi lại — đè lên bản cũ") : T("Ghi giọng mình để đọc theo"), "", 16);
    thu.addEventListener("click", async (e) => {
      e.stopPropagation();
      // Tắt tiếng đang phát TRƯỚC khi bật micro: không thì máy thu lại chính
      // giọng nó vừa phát ra, và bản thu mới lẫn hai giọng.
      window.GhiAm.dungPhat();
      try {
        dangThu = await window.GhiAm.batDau();
        ve();
      } catch (err) {
        const x = window.GhiAm.loiMicro(err);
        toast(T(x.loi) + (x.ten ? " (" + x.ten + ")" : ""), "bad");
      }
    });

    if (ban) {
      // Đang phát chính bản này thì nút đổi thành DỪNG — nhìn ra ngay là đang
      // chạy, và bấm lần nữa là dừng chứ không chồng thêm một giọng nữa.
      const dangNghe = window.GhiAm.maDangPhat() === ma;
      // Chữ đã sửa sau khi thu thì bản thu này là của chữ CŨ. Không xoá hộ —
      // đây là bản giữ lâu dài, người ta có thể vẫn muốn nghe lại — nhưng phải
      // nói ra, chứ để họ so giọng với một đoạn không còn tồn tại thì vô nghĩa.
      const cu = mocSua && ban.ts && ban.ts < mocSua;
      const nghe = nutIcon(dangNghe ? "stop" : "play",
        dangNghe ? T("Dừng phát")
                 : (cu ? T("Nghe lại — bản thu này thu TRƯỚC lần sửa, chữ đã khác")
                       : T("Nghe lại giọng mình")),
        (dangNghe ? "dangphat" : "") + (cu ? " thucu" : ""), 15);
      nghe.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (window.GhiAm.maDangPhat() === ma) { window.GhiAm.dungPhat(); ve(); return; }
        // Lấy tiếng nói ĐÚNG LÚC SẮP PHÁT. Lúc vẽ danh sách thì `ban` chỉ là
        // phần mô tả (không có base64) — cố tình thế, để vẽ một danh sách dài
        // không phải kéo cả kho thu mấy chục MB.
        const day = await window.GhiAm.docBan(ma);
        if (!day || !window.GhiAm.phat(ma, day, ve)) toast(T("Không phát được bản thu."), "bad");
        ve();
      });
      cum.appendChild(nghe);
      cum.appendChild(thu);
      const bo = nutIcon("trash", T("Xoá bản thu này"), "", 15);
      bo.addEventListener("click", async (e) => {
        e.stopPropagation();
        await window.GhiAm.xoa(ma);
        ve();
      });
      cum.appendChild(bo);
    } else {
      cum.appendChild(thu);
    }
  };

  ve();
  return cum;
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
  if (d === "kanji") return T("Hán tự");
  if (d === "javi") return T("Nhật→Việt");
  if (d === "vija") return T("Việt→Nhật");
  if (d === "vien") return T("Việt→Anh");
  if (d === "envi") return T("Anh→Việt");
  // Mục cũ không ghi hướng thì đoán theo ngăn đang mở — đằng nào danh sách cũng
  // đã lọc theo đúng một ngôn ngữ rồi.
  return NGU === "ja" ? T("Nhật→Việt") : T("Anh→Việt");
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
/**
 * Mục này có đường nào đang tới hạn không.
 *
 * Hỏi thẳng bộ não đa-đường chứ không tự đọc `srs.due` nữa: từ khi một mục có
 * bốn đường, `srs` chỉ là bản gộp, mà con số đếm trên nút "Học ngay" phải khớp
 * với hàng đợi thật — lệch nhau thì nút báo 5 mục mà mở ra 8 thẻ.
 */
function isDue(it, now) {
  if (it.del) return false;
  return window.Srs.denHan(it, now || Date.now()).length > 0;
}
function dueList(scopeList) {
  const now = Date.now();
  return scopeList.filter((it) => isDue(it, now));
}

/**
 * Hàng đợi của một buổi học: mỗi phần tử là một cặp (mục, ĐƯỜNG), không phải
 * một mục.
 *
 * Một từ có thể đến hạn ở đường nhìn mà chưa đến hạn ở đường nghe, hoặc ngược
 * lại. Xếp hàng theo mục thì không nói được chuyện đó.
 */
function hangDoi(scopeList) {
  const now = Date.now();
  const ra = [];
  for (const it of scopeList) {
    if (it.del) continue;
    for (const d of window.Srs.denHan(it, now)) ra.push(Object.assign({}, it, { _d: d }));
  }
  return ra;
}
/**
 * Cấp của một mục, nói theo cách người học đọc được.
 *
 * Bên trong đếm từ -1 (rơi về đầu) rồi 0..6. Ra ngoài thì đếm từ 1, vì "cấp 0"
 * đọc lên chẳng ai biết là đã học hay chưa.
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

/**
 * Nhịp bấm của CHÍNH người học, tính riêng cho từng đường.
 *
 * Để ở đây chứ không nhét vào từng mục: đây là thống kê về TAY người dùng —
 * bấm bằng chuột hay bằng ngón cái, máy nhanh hay máy chậm — chứ không phải
 * thuộc tính của từ. Nhét vào mục thì mỗi từ tự hiệu chỉnh riêng, mà một từ chỉ
 * được ôn dăm lần thì không bao giờ đủ mẫu.
 */
let nhipMs = null;
async function docNhipMs() {
  if (nhipMs) return nhipMs;
  const r = await chrome.storage.local.get("nhipMs");
  nhipMs = r.nhipMs || {};
  return nhipMs;
}

/**
 * Chấm một lượt ôn.
 * @param {string} key
 * @param {boolean} remembered
 * @param {number} [ms] thời gian truy xuất, đo từ lúc hiện thẻ tới lúc bấm
 * @param {string} [duong] đường nào đang được kiểm; mặc định là "nhin"
 */
async function gradeWord(key, remembered, ms, duong) {
  const d = duong || "nhin";
  const tkAll = await docNhipMs();
  let kq = null;
  await capNhat((nb) => {
    const e = nb[key];
    if (!e) return;
    const cu = (e.duong && e.duong[d]) || null;
    // Mục cũ chưa có `duong`: lấy `srs` cũ làm điểm xuất phát cho đường "nhin",
    // để một sổ tay đang dùng dở không bị đá về cấp 0 hết.
    const batDau = cu || (d === "nhin" && e.srs ? { lv: e.srs.lv } : null);
    kq = window.Srs.cham(batDau, remembered, ms || 0, tkAll[d], Date.now());
    const moi = Object.assign({}, e);
    moi.duong = Object.assign({}, e.duong || {}, { [d]: kq.duong });
    // `srs` vẫn được ghi, và vẫn là thứ mọi nơi khác đọc: đồng bộ Drive, app
    // Android, máy chủ MCP, bản extension chưa cập nhật. Nó là bản GỘP của các
    // đường — xem Srs.gomSrs.
    moi.srs = window.Srs.gomSrs(moi) || { lv: -1, due: Date.now(), ts: Date.now() };
    moi.ts = Date.now();
    nb[key] = moi;
  });
  if (kq) {
    nhipMs[d] = kq.tk;
    await chrome.storage.local.set({ nhipMs: nhipMs });
  }
  return kq;
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
      // Đóng dấu mốc cho tiến độ ôn của các mục cũ.
      //
      // Trước đây `srs` không có mốc riêng, nên lúc gộp hai máy nó phải mượn
      // mốc của cả mục — mà mốc đó nhảy theo mọi lần sửa ghi chú. Đóng dấu ngay
      // BÂY GIỜ, bằng mốc hiện có, thì từ lần sửa sau trở đi mốc chấm bài đứng
      // yên và cấp đã chấm không bị kéo tụt nữa. KHÔNG đụng vào `e.ts` — đây là
      // vá tại chỗ, không phải một lượt sửa, đừng để nó kéo cả sổ lên cloud.
      if (e && e.srs && typeof e.srs.lv === "number" && typeof e.srs.ts !== "number") {
        e.srs = Object.assign({}, e.srs, { ts: e.ts || 0 });
        daSuaCu = true;
      }
    }
  });
  if (daSuaCu) syncSoon();
  const s = await getStore();
  // Thu lại URL của lượt vẽ trước rồi bỏ những blob không mục nào còn trỏ tới.
  // Xoá một mục có ảnh mà không quét thì byte nằm lại trong IndexedDB mãi mãi.
  if (window.Anh) {
    window.Anh.nhaUrl();
    window.Anh.quet(s.nb).catch(() => {});
  }
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

/**
 * Các mục nằm trong một ngăn. Một chỗ duy nhất trả lời câu "ngăn này có gì",
 * để cái ĐẾM trên chip, cái HỌC của ngăn đó và danh sách đang hiện không bao
 * giờ nói ba con số khác nhau.
 */
function setIn(id) {
  const a = active(items);
  if (id === ALL) return a;
  if (id === NONE) return a.filter((it) => !it.deck);
  if (id === LIKE) return a.filter((it) => it.fav === 1);
  if (id === DISLIKE) return a.filter((it) => it.fav === -1);
  if (id === HANTU) return a.filter((it) => it.dict === "kanji");
  return a.filter((it) => it.deck === id);
}

function countIn(id) { return setIn(id).length; }

/** Tên đọc được của một ngăn dựng sẵn (sổ con thì hỏi deckName). */
function nhanNgan(id) {
  if (id === NONE) return T("Chưa phân loại");
  if (id === LIKE) return T("Thích");
  if (id === DISLIKE) return T("Không thích");
  if (id === HANTU) return T("Hán tự");
  return "";
}

/** Ngăn này đang có bao nhiêu mục tới hạn ôn. */
function dueIn(id) { return dueList(setIn(id)).length; }

function drawDecks() {
  const bar = $("deckBar");
  bar.innerHTML = "";
  /*
   * Mỗi ngăn là một CẶP: chip để mở ra xem, và nút học của riêng ngăn đó.
   *
   * Buổi học vốn đã chỉ lấy mục trong ngăn đang mở, nhưng muốn dùng thì phải
   * tự đoán ra luật ấy: bấm ngăn, rồi ngước lên bấm nút ở trên đầu. Nút học
   * nằm ngay trên ngăn thì "ôn nhanh đúng chỗ mình muốn" chỉ còn một cú bấm,
   * và không phải đoán gì cả.
   *
   * Chỉ hiện khi ngăn ấy CÓ mục tới hạn: ngăn nào cũng đeo một nút thì hàng
   * ngăn dài gấp đôi mà phần lớn bấm vào chỉ nhận được câu "chưa tới hạn".
   */
  const mk = (id, label, iconTen) => {
    const cum = el("span", "chipgroup");
    const b = el("button", "chip" + (current === id ? " active" : ""));
    b.type = "button";
    b.appendChild(ic(iconTen, { size: 16, weight: current === id ? "solid" : "line" }));
    b.appendChild(el("span", "grow", label));
    b.appendChild(el("span", "n", String(countIn(id))));
    b.addEventListener("click", () => { current = id; drawDecks(); draw(); });
    cum.appendChild(b);

    const den = dueIn(id);
    if (den) {
      const h = el("button", "chip hoc");
      h.type = "button";
      h.title = T2("Ôn ngay {n} mục đến hạn trong “{ten}”", { n: den, ten: label });
      h.appendChild(ic("graduation-cap", { size: 14, weight: "solid" }));
      h.appendChild(el("span", "n", String(den)));
      h.addEventListener("click", (e) => {
        e.stopPropagation();
        // Mở ngăn ra rồi mới học: hết buổi, đóng lại là thấy đúng ngăn vừa ôn,
        // chứ không rơi về danh sách tất cả.
        current = id; drawDecks(); draw();
        startStudy();
      });
      cum.appendChild(h);
    }
    bar.appendChild(cum);
  };
  mk(ALL, T("Tất cả"), "list-bullets");
  mk(NONE, T("Chưa phân loại"), "funnel");
  mk(LIKE, T("Thích"), "heart");
  mk(DISLIKE, T("Không thích"), "thumbs-down");
  // Hán tự tách riêng vì học chữ và học từ là hai buổi khác nhau: một buổi chỉ
  // chữ thì mỗi chữ được nhìn kỹ, chứ trộn lẫn thì chữ luôn bị từ lấn át.
  // Bên tiếng Anh không có ngăn này nên cũng không hiện.
  if (NGU === "ja") mk(HANTU, T("Hán tự"), "text-aa");
  activeDecks().forEach((d) => mk(d.id, d.name, "folder-simple"));

  const add = el("button", "chip add");
  add.type = "button";
  add.appendChild(ic("folder-plus", { size: 16 }));
  add.appendChild(el("span", "grow", T("Sổ mới")));
  add.addEventListener("click", createDeck);
  bar.appendChild(add);

  // Hai nhãn cố định (Thích / Không thích) không cho đổi tên hay xoá.
  const real = current !== ALL && current !== NONE && current !== LIKE && current !== DISLIKE && current !== HANTU;
  $("deckActions").style.display = real ? "" : "none";
}

async function createDeck() {
  const name = (prompt(T("Tên sổ con mới (ví dụ: Bài 5 - Kanji):")) || "").trim();
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
  const name = (prompt(T("Đổi tên sổ:"), cur) || "").trim();
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
/** Mã đầy đủ cho từng thứ tiếng mình có thể phải đọc. */
const GIONG = { vi: "vi-VN", ja: "ja-JP", en: "en-US" };

/**
 * Đọc bằng giọng máy.
 * @param {string} [ngu] "vi" | "ja" | "en". Không truyền thì theo ngôn ngữ đang
 *   tra — trang Luyện nói phải đọc được CẢ HAI chiều nên nó luôn nói rõ.
 */
function ttsSpeak(text, ngu, tuy) {
  try {
    speechSynthesis.cancel();
    const ma = GIONG[ngu] ? ngu : ((typeof NGU !== "undefined" && NGU === "ja") ? "ja" : "en");
    const t = tuy || {};
    const u = new SpeechSynthesisUtterance(text);
    u.lang = GIONG[ma];
    u.rate = t.rate != null ? t.rate : 0.9;
    if (t.pitch != null) u.pitch = t.pitch;
    // Chọn giọng bằng CoVu.giongTot chứ không lấy giọng đầu danh sách: thứ tự
    // mặc định của trình duyệt hay trả về giọng nén nhỏ, nghe rất "robot".
    const ds = speechSynthesis.getVoices();
    const v = (window.CoVu && window.CoVu.giongTot(ma, ds))
      || ds.find((x) => x.lang && x.lang.startsWith(ma));
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

/* ==================================================================== */
/* Ảnh đính kèm                                                         */
/* ==================================================================== */
/*
 * Byte ảnh nằm trong IndexedDB của máy này (xem anh.js); mục sổ tay chỉ mang
 * bản mô tả nhẹ trong `anh`. Nhét ảnh vào chính mục sổ tay là mỗi lượt đồng bộ
 * đẩy cả đống byte đó lên Drive, tệp phình lên rất nhanh rồi hỏng hẳn.
 */

/** Danh sách ảnh đang sửa trong bảng Sửa. Chốt lại vào mục khi bấm Lưu. */
let anhSua = [];

/** Một ô ảnh: bấm vào là mở to, bấm dấu × là gỡ. */
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

function oAnh(f, choGo) {
  const o = document.createElement("button");
  o.className = "anh-o"; o.type = "button";
  o.title = f.ten + " · " + window.Anh.coChu(f.cd);
  const img = document.createElement("img");
  img.alt = f.ten;
  o.appendChild(img);
  // Byte nằm trong IndexedDB nên URL chỉ có sau một lượt đọc — gắn ảnh vào sau.
  window.Anh.url(f.id).then((u) => { if (u) img.src = u; });
  o.addEventListener("click", () => { moAnh(f); });
  if (choGo) {
    const x = document.createElement("button");
    x.className = "anh-xoa"; x.type = "button"; x.textContent = "✕";
    x.title = T("Gỡ ảnh này");
    x.addEventListener("click", (e) => {
      e.stopPropagation();
      anhSua = anhSua.filter((a) => a.id !== f.id);
      veAnhSua();
    });
    o.appendChild(x);
  }
  return o;
}

/** Vẽ lại hàng ảnh trong bảng Sửa. */
function veAnhSua() {
  const hang = $("edAnh");
  hang.innerHTML = "";
  anhSua.forEach((f) => hang.appendChild(oAnh(f, true)));
}

/** Nhận một mớ File/Blob vào danh sách ảnh đang sửa. */
async function themAnh(ds) {
  const loi = $("edAnhLoi");
  loi.textContent = "";
  for (const f of Array.from(ds || [])) {
    if (!window.Anh.laAnh(f.type)) { loi.textContent = T("Chỉ nhận ảnh."); continue; }
    try {
      anhSua.push(await window.Anh.luu(f));
    } catch (e) {
      loi.textContent = (e && e.message) || T("Không lưu được ảnh.");
    }
  }
  veAnhSua();
}

$("edAnhFile").addEventListener("change", (e) => {
  themAnh(e.target.files).then(() => { e.target.value = ""; });
});
// Chụp màn hình xong Ctrl+V thẳng vào ô ghi chú là xong, khỏi qua hộp chọn tệp.
$("edNote").addEventListener("paste", (e) => {
  const tep = e.clipboardData && e.clipboardData.files;
  if (!tep || !tep.length) return;          // dán chữ thì để trình duyệt lo
  e.preventDefault();
  themAnh(tep);
});

function moSua(it, tab) {
  dangSua = { key: it.key, tab: tab || "trans" };
  anhSua = (it.anh || []).slice();
  veAnhSua();
  $("edAnhLoi").textContent = "";

  const laLink = tab === "link";
  const laGhiChu = tab === "note";
  $("edTitle").textContent = laLink ? T("Nguồn của mục này")
    : laGhiChu ? T("Ghi chú cho mục này") : T("Sửa bản dịch");
  $("edIcon").innerHTML = window.Icon(laLink ? "link-simple" : laGhiChu ? "note-pencil" : "translate", { size: 20 });
  $("edSub").textContent = laLink
    ? T("Dán địa chỉ trang hoặc video bạn đã gặp từ này, để sau còn tìm lại được ngữ cảnh.")
    : laGhiChu
    ? T("Ghi lại ngữ cảnh, thuật ngữ tương đương, cách dùng — thứ mà từ điển không nói.")
    : T("Chỉnh lại cho đúng cách nói của chuyên ngành bạn. Mỗi dòng là một nghĩa.");

  $("edOrig").textContent = it.word || "";
  $("edTrans").value = (it.means || []).join("\n");
  $("edNote").value = it.note || "";

  // Đường link: cho SỬA TAY được, vì không phải lượt lưu nào cũng có nguồn đi
  // kèm (tra từ ô gõ, hay trang mà trình duyệt không cho đọc địa chỉ), mà một
  // mục không có link thì sau này chẳng biết mình gặp nó ở đâu.
  const sc = it.src || {};
  $("edLink").value = sc.url || "";
  $("edLinkHint").textContent = (sc.yt && sc.yt.v)
    ? T2("Đang trỏ tới phút {t} của video. Sửa link sẽ mất mốc phút này.", { t: giay(sc.yt.t) })
    : (sc.sel ? T2("Đã lưu từ đoạn: “{doan}”", { doan: sc.sel.slice(0, 60) }) : "");

  // Nhắc bản gốc của máy, và cho đường quay về nếu đã từng sửa.
  const goc = it.mOrig && it.mOrig.length ? it.mOrig.join("; ") : "";
  $("edOrigHint").textContent = goc ? T2("Bản máy dịch ban đầu: {ban}", { ban: goc }) : "";
  $("edRestore").style.display = goc ? "" : "none";

  $("editSheet").classList.add("show");
  setTimeout(() => $(laLink ? "edLink" : laGhiChu ? "edNote" : "edTrans").focus(), 40);
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
  let link = $("edLink").value.trim();
  if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;   // dán thiếu https:// thì tự thêm

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
    if (anhSua.length) ne.anh = anhSua.slice(); else delete ne.anh;
    // Link: giữ nguyên mốc phút và đoạn đã tô nếu địa chỉ không đổi; đổi địa chỉ
    // thì hai thứ kia không còn đúng nữa nên bỏ đi, chứ không mang sang link mới.
    const scCu = e.src || {};
    if (!link) delete ne.src;
    else if (link !== scCu.url) {
      let ten = link;
      try { ten = new URL(link).hostname.replace(/^www\./, ""); } catch (e2) {}
      ne.src = { url: link, title: ten, sel: scCu.sel || e.word || "" };
    }
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
  toast(doiNghia ? T("Đã lưu bản dịch của bạn") : T("Đã lưu ghi chú"));
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
    b.title = on ? T2("Bỏ khỏi {ten}", { ten: ten }) : ten;
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
  wrap.appendChild(mk(1, "heart", "like", T("Thích")));
  wrap.appendChild(mk(-1, "thumbs-down", "dislike", T("Không thích")));
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

function currentActiveSet() { return setIn(current); }

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

function draw() {
  const kw = $("filter").value.trim().toLowerCase();
  const base = currentActiveSet();
  const rows = base.filter((it) => {
    if (!kw) return true;
    // Có cả furigana của câu: gõ かな tìm được câu, dù trong câu chỉ có chữ Hán.
    const hay = (it.word + " " + (it.reading || "") + " " + ((it.ruby || []).join(" ")) + " "
      + (it.means || []).join(" ") + " " + (it.note || "")).toLowerCase();
    return hay.includes(kw);
  });

  $("count").textContent = T2("Đang hiện {n} mục", { n: rows.length })
    + (rows.length !== base.length ? " trong " + base.length : "");

  const den = dueList(base).length;
  $("dueCount").textContent = String(den);
  // Nói thẳng buổi học sắp tới lấy mục ở đâu. Nút chỉ ghi "Học ngay" thì đang
  // mở một sổ con mà bấm vào, người ta vẫn tưởng nó ôn cả sổ tay.
  const tenNgan = current === ALL ? "" : (deckName(current) || nhanNgan(current));
  const oNgan = $("study").querySelector(".scope");
  if (oNgan) oNgan.textContent = tenNgan ? "\u2002·\u2002" + tenNgan : "";
  const chip = $("dueChip");
  if (den) { chip.style.display = ""; chip.textContent = T2("{n} mục đến hạn", { n: den }); }
  else chip.style.display = "none";

  const listEl = $("list");
  listEl.innerHTML = "";

  if (!rows.length) {
    const d = el("div", "empty");
    d.appendChild(ic("notebook", { size: 40 }));
    d.appendChild(el("div", null, active(items).length
      ? T("Không có mục nào ở đây.")
      : T("Chưa có mục nào. Tra một từ rồi bấm “Lưu”.")));
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
    // Cả câu thì furigana nằm TRÊN từng khúc chữ Hán (ruby), không phải một dòng
    // kana chạy dài ở bên cạnh — dòng đó đọc còn mệt hơn đọc chữ Hán.
    const wSpan = el("span", "w" + (NGU === "ja" ? " ja" : ""));
    const rb = (it.ruby && it.ruby.length) ? window.Kana.htmlRuby(it.word, it.ruby) : "";
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

    const spk = nutIcon("speaker-high", T("Phát âm"), "", 17);
    spk.addEventListener("click", () => speak(it.word, it.audio));
    head.appendChild(spk);

    // Ghi âm nằm NGAY CẠNH nút phát âm: nghe mẫu rồi đọc lại là một mạch, tách
    // hai nút ra hai chỗ thì mỗi vòng đọc theo lại phải đi tìm.
    head.appendChild(cumGhiAm(it.key));

    head.appendChild(favButtons(it));
    head.appendChild(el("span", "tag", dirLabel(it.dict)));
    if (it.mEdit) {
      const t = el("span", "tag edited");
      t.appendChild(ic("pencil-simple", { size: 12 }));
      t.appendChild(el("span", null, T("đã sửa")));
      head.appendChild(t);
    }
    // Cấp và hạn ôn đi cùng một chỗ: biết "đến hạn" mà không biết mình đang ở
    // cấp mấy thì không thấy được là đã tiến tới đâu — mà đó mới là thứ giữ
    // người ta ôn tiếp.
    {
      const den = isDue(it, now);
      const t = el("span", "tag srs" + (den ? " due" : ""));
      t.appendChild(ic(den ? "alarm" : "target", { size: 12 }));
      t.appendChild(el("span", null, chuCap(it, now)));
      t.title = T("Nhớ thì lên một cấp và lần ôn sau xa hơn; quên thì về lại đầu.");
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
    if (hvStr) body.appendChild(el("div", "hv", T2("Hán Việt: {am}", { am: hvStr })));
    if (it.dict === "kanji") {
      const meta = window.HanTu.META(it.kanji);
      if (meta) body.appendChild(el("div", "t-tiny faint", meta));
    }
    if (it.means && it.means.length) {
      body.appendChild(el("div", "m", it.means.slice(0, 4).join("; ")));
    }
    if (it.note && it.note.trim()) body.appendChild(khoiGhiChu(it.note.trim()));
    if (it.anh && it.anh.length) {
      const hang = el("div", "anh-hang");
      it.anh.forEach((f) => hang.appendChild(oAnh(f, false)));
      body.appendChild(hang);
    }

    /* --- dòng chân: nguồn + thời gian --- */
    const meta = el("div", "meta");
    if (it.src && it.src.url) {
      const s = el("span", "srcline");
      const yt = it.src.yt;
      if (yt && yt.v) {
        // Nguồn video thì cái đáng hiện là PHÚT THỨ MẤY, không phải "youtube.com".
        s.appendChild(ic("subtitles", { size: 13 }));
        s.appendChild(el("span", null, "YouTube · " + giay(yt.t)));
        s.title = T2("Nghe lại: {ten}", { ten: (it.src.title || "") + (yt.kenh ? " — " + yt.kenh : "") });
      } else {
        let hostn = it.src.url;
        try { hostn = new URL(it.src.url).hostname.replace(/^www\./, ""); } catch (e) {}
        s.appendChild(ic("link-simple", { size: 13 }));
        s.appendChild(el("span", null, hostn));
        s.title = T2("Lưu từ: {nguon}", { nguon: it.src.title || it.src.url });
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

    const sua = nutIcon("translate", T("Sửa bản dịch cho đúng chuyên ngành"), "", 17);
    sua.addEventListener("click", () => moSua(it, "trans"));
    hang.appendChild(sua);

    const gc = nutIcon("note-pencil", it.note ? T("Sửa ghi chú") : T("Thêm ghi chú"), it.note ? "on" : "", 17);
    gc.addEventListener("click", () => moSua(it, "note"));
    hang.appendChild(gc);

    // Nút nguồn hiện CẢ KHI mục chưa có link: bấm vào là thêm được. Trước đây nút
    // này biến mất khi không có nguồn, nên một mục lỡ lưu thiếu link thì trong sổ
    // tay không còn đường nào chữa lại.
    {
      const laYt = !!(it.src && it.src.yt && it.src.yt.v);
      const coLink = !!(it.src && it.src.url);
      const open = nutIcon(laYt ? "subtitles" : "link-simple",
        laYt ? T2("Nghe lại đúng chỗ này trong video ({t})", { t: giay(it.src.yt.t) })
             : coLink ? T("Mở lại trang nguồn và tô sáng vị trí đã lưu")
             : T("Thêm link nguồn"), coLink ? "" : "faint", 17);
      open.addEventListener("click", () => { if (coLink) openSource(it); else moSua(it, "link"); });
      // Chuột phải vào nút = sửa/bỏ link, khỏi phải mở hộp sửa rồi mò xuống dưới.
      open.addEventListener("contextmenu", (ev) => { ev.preventDefault(); moSua(it, "link"); });
      hang.appendChild(open);
    }

    const del = nutIcon("trash", T("Xoá khỏi sổ tay"), "danger", 17);
    del.addEventListener("click", async () => {
      await capNhat((nb) => {
        nb[it.key] = window.Muc.biaMo(it);
      });
      await load();
      syncSoon();
      toast(T2("Đã xoá “{tu}”", { tu: it.word.slice(0, 24) }));
    });
    hang.appendChild(del);
    ctl.appendChild(hang);

    const sel = document.createElement("select");
    sel.title = T("Chuyển vào sổ");
    sel.style.cssText = "font-size:12.5px;padding:6px 8px;max-width:150px;border-radius:var(--r-xs)";
    const optNone = document.createElement("option");
    optNone.value = NONE; optNone.textContent = T("Chưa phân loại");
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
    b.appendChild(el("span", "lb", val === 1 ? T("Thích") : T("Không thích")));
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
  // Xếp hàng thẳng từ danh sách đang mở: `hangDoi` đã tự hỏi từng đường một,
  // lọc qua `dueList` trước đó là lọc HAI LẦN và làm rơi mất những mục mà chỉ
  // một đường tới hạn.
  const due = hangDoi(currentActiveSet());
  if (!due.length) {
    toast(T("Không có mục nào đến hạn trong mục này. Quay lại sau nhé!"), "bad");
    return;
  }
  session = { queue: due.slice().sort(() => Math.random() - 0.5), done: 0, again: 0, deleted: 0 };
  lastDeleted = null;
  $("stUndo").style.display = "none";
  $("stBody").style.display = "";
  $("stDone").style.display = "none";
  ovl.classList.add("show");
  batNhacTau();
  showCard();
}

/* ==================================================================== */
/* Nhịp đọc & lời nhắc tập trung                                        */
/* ==================================================================== */

// Tiếng tách khi bấm nút: gắn MỘT người nghe cho cả trang, hỏi lại cài đặt ở
// từng lượt bấm. Gắn từng nút một thì mỗi nút mới dựng ra sau này lại câm.
if (window.CoVu) window.CoVu.ngheNut(document, () => CAI.tach !== false);

/**
 * Hẹn nhạc ga tàu cho buổi học. Xem nhac-tau.js về việc vì sao thưa và ngẫu nhiên.
 *
 * `duoc()` được hỏi lại ở TỪNG lượt chứ không chỉ lúc bật: buổi học có thể đã
 * đóng, hoặc người ta đã chuyển sang tab khác — lúc đó nhạc vang lên là quấy rầy.
 */
function batNhacTau() {
  if (!window.NhacTau) return;
  if (CAI.nhacTau === false) { window.NhacTau.tat(); return; }
  window.NhacTau.bat({
    duoc: () => ovl.classList.contains("show") && !document.hidden
  });
}

/**
 * Cổ vũ một lượt chấm: tiếng chuông ngay, câu nói sau một nhịp ngắn.
 *
 * Gọi TRƯỚC mọi thứ khác trong grade() và không `await`: người ta bấm là muốn
 * nghe ngay, chờ ghi sổ với đồng bộ xong mới kêu thì tiếng lạc hẳn khỏi cái bấm.
 */
function coVu(nho) {
  if (!window.CoVu || CAI.coVu === false) return;
  window.CoVu.chuong(nho);
  const ngu = NGU === "ja" ? "ja" : "en";
  // Đọc nhanh hơn và cao giọng hơn lúc đọc từ vựng: đây là một tiếng reo, đọc
  // đúng nhịp tra từ điển thì nghe như đang thông báo ở sân bay.
  setTimeout(() => ttsSpeak(window.CoVu.loi(nho, ngu), ngu, { rate: 1.02, pitch: 1.12 }),
             window.CoVu.CHO_NOI);
}

/** Giữ tốc độ trong khoảng nhịp-doc.js chấp nhận; số rác thì về mặc định. */
function nhipTocHopLe(v) {
  const n = parseInt(v, 10);
  if (!n) return SET_DEFAULTS.nhipToc;
  return Math.max(window.NhipDoc.TOC_MIN, Math.min(window.NhipDoc.TOC_MAX, n));
}

/** Chạy nhịp đọc trên câu ở mặt trước thẻ, nếu người dùng có bật. */
function batNhip() {
  if (!window.NhipDoc) return 0;
  if (CAI.nhip === false) { window.NhipDoc.dung(); return 0; }
  // Câu trước, nghĩa sau — đúng thứ tự mắt cần đi.
  return window.NhipDoc.batDau([$("stWord"), $("stMean")], { toc: nhipTocHopLe(CAI.nhipToc) });
}

/**
 * Hẹn lại đồng hồ nhắc tập trung theo số phút trong cài đặt.
 * Mốc đếm tính từ lúc gọi — tức là từ lúc mở sổ tay, và từ lúc bấm Lưu nếu
 * người dùng vừa đổi số phút.
 */
function datLoiNhac() {
  if (!window.NhipDoc) return;
  window.NhipDoc.datNhac(CAI.nhacPhut, () => {
    const chu = window.NhipDoc.loiNhac(NGU);
    ttsSpeak(chu, NGU === "ja" ? "ja" : "en");
    // Nói kèm một dòng chữ: tai nghe đang rút, hoặc máy không có giọng thứ
    // tiếng đó, thì ít ra mắt vẫn nhận được lời nhắc.
    toast(chu);
  });
}

/**
 * @param {boolean} [giuLat] thẻ đang lật rồi thì vẽ lại luôn ở trạng thái đã
 *   lật. Dùng khi sửa nghĩa ngay giữa buổi học: úp thẻ lại lúc đó chẳng khác
 *   gì bắt đoán lại một câu vừa mới đọc đáp án.
 */
/*
 * Bấm giờ truy xuất.
 *
 * Đo từ lúc thẻ hiện ra tới lúc bấm Nhớ — đúng như đã bàn. Có một điểm đáng
 * biết: quãng này gồm cả thời gian ĐỌC đáp án sau khi lật thẻ, nên nó là thời
 * gian truy xuất cộng một hằng số. Muốn tín hiệu sạch hơn thì đo tới lúc bấm
 * "Hiện nghĩa" (lúc đó việc nhớ đã xong); đổi một dòng là được.
 */
let mocHienThe = 0;

function showCard(giuLat) {
  if (window.NhipDoc) window.NhipDoc.dung();   // thẻ mới: nhịp của thẻ cũ phải tắt
  goHoiNguon();
  const it = theCardHienTai();
  if (!it) { finishStudy(); return; }
  mocHienThe = performance.now();
  const daLat = giuLat && $("stGrade").style.display !== "none";

  $("stBody").style.display = "";
  $("stDone").style.display = "none";
  $("stProg").textContent = T2("Còn {n} mục · đã xong {xong}", { n: session.queue.length, xong: session.done });

  const laNghe = it._d === "nghe";
  const laLien = it._d === "dong" || it._d === "trai";
  $("stNgheMat").style.display = laNghe ? "" : "none";
  $("stLienMat").style.display = laLien ? "" : "none";
  $("stMatChu").style.display = laNghe ? "none" : "";
  if (laLien) veBaiLien(it);
  $("stNgheCau").style.display = "none";
  $("stNgheCau").textContent = "";
  if (laNghe) {
    const lv = ((it.duong || {}).nghe || {}).lv;
    const toc = window.Srs.tocDoNghe(lv);
    $("stNgheToc").textContent = T2("Tốc độ ×{t} — nhanh dần theo cấp", { t: toc });
  }

  $("stCard").className = "studycard" + (it.kind === "sent" ? " sent" : "") + (it.dict === "kanji" ? " kanji" : "");
  $("stWord").textContent = it.word;
  $("stWord").className = "cw" + (NGU === "ja" ? " ja" : "");
  renderStudyFav(it);

  const src = $("stSrc");
  if (it.src && it.src.url) {
    const laYt = !!(it.src.yt && it.src.yt.v);
    src.innerHTML = window.Icon(laYt ? "subtitles" : "link-simple", { size: 15 })
      + '<span class="lb" data-chu>' + (laYt ? T2("Nghe lại {t}", { t: giay(it.src.yt.t) }) : T("Mở nguồn")) + "</span>";
    src.style.display = ""; src.onclick = () => openSource(it);
  } else { src.style.display = "none"; src.onclick = null; }

  // Cụm ghi âm của buổi học dựng lại mỗi lần đổi thẻ, và dùng CHÍNH khoá của
  // mục — nên bản thu ghi ở sổ tay mở buổi học ra là nghe lại được ngay.
  const oGhi = $("stGhiAm");
  if (oGhi) { oGhi.textContent = ""; oGhi.appendChild(cumGhiAm(it.key)); }

  $("stRead").textContent = "";
  $("stMean").innerHTML = "";
  $("stMyNote").innerHTML = "";
  $("stReveal").style.display = laLien ? "none" : "";
  $("stGrade").style.display = "none";
  // Thẻ nghe tự phát một lượt ngay: bắt bấm thêm một nút nữa mới nghe là thừa.
  if (laNghe && !daLat) setTimeout(phatCauNghe, 120);
  if (daLat) revealCard();
}

function revealCard() {
  const it = theCardHienTai();
  if (!it) return;
  if (it._d === "nghe") {
    // Lật thẻ nghe: hiện CHỮ của câu vừa nghe + bản dịch, và tô đậm chính từ.
    $("stMatChu").style.display = "";
    const c = (it.cauNghe || {}).cau || "";
    const o = $("stNgheCau");
    o.style.display = "";
    o.innerHTML = "";
    o.appendChild(el("div", "t-lead", c));
    if ((it.cauNghe || {}).dich) o.appendChild(el("div", "t-small muted", it.cauNghe.dich));
  }
  const hvS = hanVietOf(it.word);
  $("stRead").textContent = (it.reading || "") + (hvS ? ((it.reading ? "\u3000·\u3000" : "") + T2("Hán Việt: {am}", { am: hvS })) : "");
  // Lật thẻ một CÂU: cách đọc của nó là ruby trên chính câu ở mặt trước.
  const rbS = (it.ruby && it.ruby.length) ? window.Kana.htmlRuby(it.word, it.ruby) : "";
  const oW = $("stWord");
  if (oW) {
    if (rbS) { oW.innerHTML = rbS; oW.classList.add("co-ruby"); }
    else { oW.textContent = it.word; oW.classList.remove("co-ruby"); }
  }
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
  if (it.anh && it.anh.length) {
    const hang = el("div", "anh-hang");
    it.anh.forEach((f) => hang.appendChild(oAnh(f, false)));
    $("stMyNote").appendChild(hang);
  }
  $("stReveal").style.display = "none";
  $("stGrade").style.display = "";
  // Chạy nhịp SAU CÙNG: nó bọc cụm cho cả câu lẫn phần nghĩa, nên phải đợi
  // nghĩa được vẽ xong đã.
  batNhip();
}

async function grade(remembered) {
  // Bài liên kết tự chấm bằng nút Xong; phím tắt 1/2 không được cướp lượt.
  if (session.queue[0] && (session.queue[0]._d === "dong" || session.queue[0]._d === "trai")) return;
  const it = session.queue.shift();
  if (!it) return;
  coVu(remembered);
  // Chốt giờ TRƯỚC mọi lượt await: chờ ghi sổ xong mới đo là đo cả tốc độ ổ đĩa.
  const ms = mocHienThe ? Math.round(performance.now() - mocHienThe) : 0;
  mocHienThe = 0;
  await gradeWord(it.key, remembered, ms, it._d || "nhin");
  if (remembered) session.done++;
  else { session.again++; session.queue.push(Object.assign({}, it)); }   // quên -> học lại cuối hàng

  // Mọi lượt chấm đều được ghi vào tiến độ, kể cả lượt "quên": công sức bỏ ra là
  // như nhau, mà đếm cả lượt quên mới khuyến khích người ta dám chấm thật.
  const moi = await theoDoi.ghiLuotOn(remembered);
  syncSoon();

  /*
   * KHÔNG gọi load() ở đây.
   *
   * load() quét cả sổ rồi VẼ LẠI TOÀN BỘ danh sách phía sau — trong khi màn học
   * đang phủ kín màn hình, chẳng ai nhìn thấy danh sách ấy. Đo trên sổ 300 mục:
   * mỗi lượt bấm Nhớ mất trung bình 7,3 GIÂY (lượt đầu 33 giây); bỏ đi còn 46ms.
   * Đó đúng là chuyện "bấm xong lâu mới sang từ khác".
   *
   * Thứ duy nhất thật sự cần sau lượt chấm là CẤP MỚI của đúng thẻ vừa chấm, để
   * nói ra trong lời báo. Đọc mỗi mục đó rồi vá vào `items` tại chỗ; danh sách
   * được vẽ lại một lần lúc đóng buổi học (closeStudy đã gọi load()).
   */
  const nbSau = (await chrome.storage.local.get("notebook")).notebook || {};
  const sau = (nbSau[it.key] || {}).srs;
  const oCu = items.find((x) => x.key === it.key);
  if (oCu && nbSau[it.key]) Object.assign(oCu, nbSau[it.key]);
  toast((remembered ? T("Nhớ") : T("Quên")) + " → " +
    tenCap(sau) + " · " + khiNaoOn(sau && sau.due, Date.now()));

  // Sau khi NHỚ, mục có nguồn thì hỏi xem có muốn quay lại nghe không — chứ
  // không quăng thẳng sang thẻ kế.
  const tiep = () => { if (!hoiNguon(it)) showCard(); };
  if (moi.length) {
    // Chờ xem hết chúc mừng rồi mới sang thẻ tiếp — nếu không thì popup che
    // mất thẻ mới và người dùng bấm nhầm.
    window.TienDo.anMung(moi, tiep);
  } else {
    tiep();
  }
}

/* ==================================================================== */
/* Bài liên kết: nhặt cho hết tập đồng nghĩa / trái nghĩa               */
/* ==================================================================== */
/*
 * Não không cất từ như từ điển tra theo khoá, nó cất theo láng giềng: muốn nói
 * "cải thiện" thì 改善 / 改良 / 向上 / 進歩 cùng sáng lên rồi tranh nhau. Người
 * ta biết từ mà vẫn nói nhầm từ không phải vì quên, mà vì chọn sai giữa mấy ứng
 * viên gần nhau. Thẻ từ đơn không luyện được chuyện đó vì nó giả vờ mỗi từ đứng
 * một mình. Bài này luyện thẳng vào.
 */
let baiLien = null;         // { it, duong, dung:Set, o:[], chon:Set, moc }

function veBaiLien(it) {
  const d = it._d;
  const l = it.lien || {};
  const dung = (d === "dong" ? l.dong : l.trai) || [];
  const kia = (d === "dong" ? l.trai : l.dong) || [];
  // Nhiễu lấy từ CHÍNH sổ tay: chúng là từ người học đang học nên nhìn quen
  // mắt — nhiễu thật, chứ không phải nhiễu loại được ngay từ cái nhìn đầu.
  const xa = items
    .filter((x) => x.key !== it.key && !x.del && x.word && x.word !== it.word)
    .map((x) => x.word);
  const o = window.TuLien.dungDe(dung, kia, xa);

  baiLien = { it: it, duong: d, dung: new Set(dung), o: o, chon: new Set(), moc: performance.now() };
  $("stLienDe").textContent = d === "dong"
    ? T2("Nhặt cho hết những từ CÙNG NGHĨA với {t}", { t: it.word })
    : T2("Nhặt cho hết những từ TRÁI NGHĨA với {t}", { t: it.word });
  $("stLienKq").textContent = "";
  $("stLienXong").style.display = "";
  $("stLienXong").disabled = false;

  const khung = $("stLienO");
  khung.textContent = "";
  for (const chu of o) {
    const b = el("button", null, chu);
    b.type = "button";
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
  const ms = Math.round(performance.now() - b.moc);
  let dung = 0, sai = 0;
  for (const c of b.chon) { if (b.dung.has(c)) dung++; else sai++; }
  const kq = window.TuLien.chamBai({ dung: dung, tong: b.dung.size, sai: sai, ms: ms });

  // Cho xem lại đề đã chấm: xanh = nhặt đúng, gạch đỏ = nhặt nhầm, viền đứt =
  // BỎ SÓT. Bỏ sót mới là thứ đáng nhìn lại nhất, nên nó phải có dấu riêng.
  for (const nut of $("stLienO").querySelectorAll("button")) {
    const chu = nut.textContent;
    nut.disabled = true;
    nut.classList.remove("chon");
    if (b.chon.has(chu)) nut.classList.add(b.dung.has(chu) ? "dung" : "sai");
    else if (b.dung.has(chu)) nut.classList.add("sot");
  }
  $("stLienXong").style.display = "none";
  $("stLienKq").textContent = T2("Nhặt được {a}/{b} · {t} giây",
    { a: dung, b: b.dung.size, t: Math.round(ms / 100) / 10 });

  coVu(kq.nho);
  await gradeWord(b.it.key, kq.nho, kq.ms, b.duong);
  const moi = await theoDoi.ghiLuotOn(kq.nho);
  syncSoon();
  if (kq.nho) session.done++; else session.again++;
  // Cho hai giây nhìn lại bài mình vừa làm rồi mới sang thẻ kế.
  setTimeout(() => {
    if (moi.length) window.TienDo.anMung(moi, showCard); else showCard();
  }, 2000);
}

/* ==================================================================== */
/* Cửa sổ 5 giây: quay lại nguồn nghe lại                               */
/* ==================================================================== */
/*
 * Nhớ được một từ xong là lúc dễ tiếp thu nhất — vừa moi nó ra khỏi trí nhớ
 * thì cả cụm liên kết quanh nó đang sáng. Nghe lại đúng câu đã gặp ngay lúc ấy
 * là nối được chữ với âm thật, thứ mà thẻ chữ không bao giờ làm được.
 *
 * Nhưng KHÔNG được bắt buộc, và không được cản. Nên: năm giây đếm ngược, không
 * bấm gì thì tự sang thẻ kế. Ai đang ôn nhanh sẽ chẳng thấy vướng, ai muốn
 * nghe thì có cửa. Bấm "Không" là đi luôn, không phải chờ hết năm giây.
 *
 * Đã chọn nghe thì KHÔNG tự chuyển thẻ nữa: mở nguồn ra là mắt rời khỏi app,
 * tự nhảy thẻ lúc đó chỉ làm mất chỗ.
 */
const CHO_NGUON = 5;                  // giây
let demNguon = null, xongNguon = null;

function goHoiNguon() {
  if (demNguon) { clearInterval(demNguon); demNguon = null; }
  xongNguon = null;
  const a = $("stHoiNguon"), b = $("stDaNghe");
  if (a) a.style.display = "none";
  if (b) b.style.display = "none";
}

/**
 * @returns {boolean} có mở cửa sổ hỏi không. false = cứ sang thẻ kế như cũ.
 */
function hoiNguon(it) {
  if (!it || !it.src || !it.src.url) return false;      // không có nguồn thì thôi
  const o = $("stHoiNguon");
  if (!o) return false;
  goHoiNguon();
  $("stGrade").style.display = "none";
  o.style.display = "";
  xongNguon = it;
  let con = CHO_NGUON;
  $("stDem").textContent = "(" + con + ")";
  demNguon = setInterval(() => {
    con -= 1;
    if (con > 0) { $("stDem").textContent = "(" + con + ")"; return; }
    goHoiNguon();
    showCard();
  }, 1000);
  return true;
}

function coNgheLai() {
  const it = xongNguon;
  if (demNguon) { clearInterval(demNguon); demNguon = null; }
  $("stHoiNguon").style.display = "none";
  if (!it) { showCard(); return; }
  $("stDaNghe").style.display = "";
  openSource(it);
  speak(it.word, it.audio);
}

function khongNgheLai() { goHoiNguon(); showCard(); }

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
  if (window.NhipDoc) window.NhipDoc.dung();
  goHoiNguon();
  if (window.NhacTau) window.NhacTau.tat();
  $("stBody").style.display = "none";
  $("stDone").style.display = "";
  $("stProg").textContent = "";
  $("stDoneIcon").innerHTML = window.Icon("confetti", { size: 56, weight: "duo" });

  const view = await theoDoi.xem();
  const phan = [T2("Đã thuộc {n} mục", { n: session.done })];
  if (session.again) phan.push(T2("học lại {n} lượt", { n: session.again }));
  if (session.deleted) phan.push(T2("đã xoá {n} mục", { n: session.deleted }));
  phan.push(view.homNay.dat
    ? T2("Hôm nay đạt mục tiêu rồi — chuỗi {n} ngày.", { n: Math.max(1, view.chuoi.hienTai) })
    : T2("Còn {n} lượt nữa là đạt mục tiêu hôm nay.", { n: view.homNay.conLai }));
  $("stSummary").textContent = phan.join(" · ");

  await load();
  syncSoon();
}

function closeStudy() {
  if (window.NhipDoc) window.NhipDoc.dung();
  goHoiNguon();
  if (window.NhacTau) window.NhacTau.tat();
  ovl.classList.remove("show");
  load();
  if ($("viewProgress").classList.contains("show")) veTienDo();
}

$("study").addEventListener("click", startStudy);
$("stReveal").addEventListener("click", revealCard);
/**
 * Phát câu nghe. Tốc độ theo cấp của chính đường nghe — xem Srs.tocDoNghe.
 * Cấp thấp nghe chậm cho rõ từng chữ, lên cấp thì đẩy về tốc độ nói thật.
 */
function phatCauNghe() {
  const it = theCardHienTai();
  if (!it || !it.cauNghe || !it.cauNghe.cau) return;
  const lv = ((it.duong || {}).nghe || {}).lv;
  ttsSpeak(it.cauNghe.cau, NGU === "ja" ? "ja" : "en", { rate: window.Srs.tocDoNghe(lv) });
}
$("stNghePhat").addEventListener("click", phatCauNghe);
$("stLienXong").addEventListener("click", xongBaiLien);
$("stCoNghe").addEventListener("click", coNgheLai);
$("stKhongNghe").addEventListener("click", khongNgheLai);
$("stTiep").addEventListener("click", () => { goHoiNguon(); showCard(); });
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
  const header = [T("Từ"), T("Phiên âm (IPA)"), T("Nghĩa"), T("Ghi chú"), T("Đã sửa"), T("Sổ"), "Hướng", T("Ngày lưu")];
  const rows = list.map((it) => [
    it.word, it.reading || "", (it.means || []).join("; "), it.note || "",
    it.mEdit ? "x" : "", deckName(it.deck) || "", dirLabel(it.dict), fmtDate(it.ts)
  ].map(csvCell).join(","));
  download("neutrondict-sotay-" + fileTag() + ".csv",
    "﻿" + header.map(csvCell).join(",") + "\n" + rows.join("\n"), "text/csv;charset=utf-8");
}

/* ==================================================================== */
/* Bản CHIA SẺ — mang sổ tay sang máy người khác                        */
/* ==================================================================== */
/*
 * Khác gì với "Sao lưu .json": bản sao lưu là để CỨU CHÍNH MÌNH — nó mang cả
 * tiến độ ôn, cả sổ con, cả chuỗi ngày, và nạp vào là đè lên. Bản chia sẻ thì
 * đi sang máy NGƯỜI KHÁC, nên:
 *
 *   - Là CSV, mở bằng Excel / Google Sheets được. Người nhận nhìn thấy mình
 *     sắp nạp cái gì trước khi nạp — chứ không phải một cục JSON tin thì tin.
 *   - Mang đủ NGỮ CẢNH: đường link, phút thứ mấy trong video, câu gốc đã bôi
 *     đen, furigana theo từng chữ Hán. Một danh sách từ trơ trọi thì người nhận
 *     học được chữ mà không biết nó dùng ở đâu.
 *   - KHÔNG mang tiến độ ôn của mình sang. Sóng ôn tập là của từng người: bạn
 *     thuộc rồi không có nghĩa là người nhận cũng thuộc.
 *   - Nạp vào thì CHỈ THÊM. Từ nào người nhận đã có thì giữ nguyên bản của họ,
 *     chỉ điền vào những ô họ còn để trống.
 *
 * Ba cột đầu cố định là Từ vựng / Furigana / Nghĩa — đó là ba thứ ai mở file
 * cũng cần thấy ngay, và cũng đúng thứ tự mà Anki với Quizlet chờ đợi.
 */

/** Tên cột, và cũng là thứ tự cột. Đổi ở đây là đổi cả xuất lẫn nạp. */
const COT_CHIA_SE = [
  "Từ vựng", "Furigana", "Nghĩa", "Ghi chú", "Loại", "Hướng tra", "Sổ",
  "Link nguồn", "Phút video", "Mã video", "Kênh", "Tên nguồn", "Câu gốc",
  "Furigana theo chữ Hán", "Phát âm", "Ngày lưu"
];

/** "1:23" -> 83 giây. Trả về null nếu ô trống hoặc không đọc được. */
function giayTuChu(s) {
  const x = String(s || "").trim();
  if (!x) return null;
  const p = x.split(":").map((n) => parseInt(n, 10));
  if (p.some((n) => !isFinite(n))) return null;
  return p.reduce((a, b) => a * 60 + b, 0);
}

function loaiCua(it) {
  if (it.dict === "kanji") return "chữ Hán";
  if (it.kind === "sent") return "câu";
  return "từ";
}

function hangChiaSe(it) {
  const src = it.src || {};
  const yt = src.yt || {};
  return [
    it.word,
    it.reading || "",
    (it.means || []).join(" / "),
    it.note || "",
    loaiCua(it),
    it.dict || "",
    deckName(it.deck) || "",
    src.url || "",
    yt.v ? giay(yt.t) : "",
    yt.v || "",
    yt.kenh || "",
    src.title || "",
    src.sel || "",
    (it.ruby || []).join(" "),
    it.audio || "",
    it.ts ? new Date(it.ts).toISOString().slice(0, 10) : ""
  ];
}

/**
 * Xuất CẢ SỔ, cả hai thứ tiếng — không theo bộ lọc đang bật trên màn hình.
 *
 * Nút "CSV" bên cạnh mới là nút xuất đúng những mục đang hiện. Nút này thì để
 * gửi sổ tay cho người khác, mà gửi thiếu một nửa vì lúc bấm đang đứng ở ngăn
 * tiếng Nhật là kiểu hỏng im lặng tệ nhất: người gửi tưởng đã gửi hết, người
 * nhận cũng không có cách nào biết là mình đang thiếu.
 */
async function exportChiaSe() {
  const s = await getStore();
  const list = Object.entries(s.nb || {})
    .map(([key, v]) => ({ key, ...v }))
    .filter((it) => !it.del)
    .sort((a, b) => (a.ts || 0) - (b.ts || 0));
  if (!list.length) { toast(T("Chưa có mục nào để xuất"), "bad"); return; }
  const dong = [COT_CHIA_SE.map(csvCell).join(",")];
  for (const it of list) dong.push(hangChiaSe(it).map(csvCell).join(","));
  // BOM ở đầu: không có nó thì Excel bản Windows mở ra tiếng Việt và tiếng Nhật
  // đều thành ký tự lạ.
  download("neutrondict-chiase.csv", "﻿" + dong.join("\n"), "text/csv;charset=utf-8");
  toast(T2("Đã xuất {n} mục — gửi file này cho ai cũng nạp được", { n: list.length }));
}

/**
 * Đọc một file CSV thành mảng các hàng.
 *
 * Tự viết chứ không tách bằng dấu phẩy: ô "Nghĩa" gần như luôn có dấu phẩy, và
 * ô "Câu gốc" thì có cả xuống dòng. Tách bừa là lệch cột từ dòng thứ hai trở đi
 * mà chẳng có gì báo.
 */
function docCsv(text) {
  const s = String(text || "").replace(/^﻿/, "");
  const hang = [];
  let o = [], cell = "", trong = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (trong) {
      if (c === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; }   // "" bên trong = một dấu nháy
        else trong = false;
      } else cell += c;
      continue;
    }
    if (c === '"') { trong = true; continue; }
    if (c === ",") { o.push(cell); cell = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { o.push(cell); hang.push(o); o = []; cell = ""; continue; }
    cell += c;
  }
  if (cell || o.length) { o.push(cell); hang.push(o); }
  return hang.filter((h) => h.some((x) => String(x).trim()));
}

async function napChiaSeFile(file) {
  let hang;
  try { hang = docCsv(await file.text()); } catch (e) { hang = []; }
  if (hang.length < 2) { toast(T("File không đọc được hoặc không có dòng nào"), "bad"); return; }

  // Bám theo TÊN CỘT chứ không theo vị trí: người ta hay mở file ra trong Excel,
  // thêm một cột ghi chú của mình rồi mới gửi đi.
  const dau = hang[0].map((x) => String(x).trim().toLowerCase());
  const cot = {};
  COT_CHIA_SE.forEach((ten) => { cot[ten] = dau.indexOf(ten.toLowerCase()); });
  if (cot["Từ vựng"] < 0) { toast(T("File thiếu cột “Từ vựng”"), "bad"); return; }
  const o = (h, ten) => (cot[ten] >= 0 ? String(h[cot[ten]] || "").trim() : "");

  // Sổ con nhắc tới trong file mà máy này chưa có thì tạo mới.
  let them = 0, boQua = 0, boSung = 0;
  await capNhat((nb, dks) => {
    const tenSo = {};
    for (const id in dks) { const d = dks[id]; if (d && !d.del) tenSo[d.name] = id; }

    for (let i = 1; i < hang.length; i++) {
      const h = hang[i];
      const tu = o(h, "Từ vựng");
      if (!tu) continue;
      const huong = o(h, "Hướng tra") || (window.Ngu.nganChinh(NGU) || "envi");
      const key = huong + ":" + tu;
      const nghia = o(h, "Nghĩa").split(" / ").map((x) => x.trim()).filter(Boolean);

      const src = {};
      const url = o(h, "Link nguồn");
      if (url) {
        src.url = url;
        if (o(h, "Tên nguồn")) src.title = o(h, "Tên nguồn");
        if (o(h, "Câu gốc")) src.sel = o(h, "Câu gốc");
        const mv = o(h, "Mã video");
        if (mv) {
          src.yt = { v: mv, t: giayTuChu(o(h, "Phút video")) || 0 };
          if (o(h, "Kênh")) src.yt.kenh = o(h, "Kênh");
        }
      }

      const cu = nb[key];
      if (cu && !cu.del) {
        // Người nhận đã có từ này rồi: KHÔNG đè. Chỉ điền vào ô còn trống —
        // công hiệu đính của họ là của họ.
        let doi = false;
        if (!cu.reading && o(h, "Furigana")) { cu.reading = o(h, "Furigana"); doi = true; }
        if (!(cu.src && cu.src.url) && src.url) { cu.src = src; doi = true; }
        if (!cu.note && o(h, "Ghi chú")) { cu.note = o(h, "Ghi chú"); doi = true; }
        if (!(cu.ruby && cu.ruby.length) && o(h, "Furigana theo chữ Hán")) {
          cu.ruby = o(h, "Furigana theo chữ Hán").split(/\s+/).filter(Boolean); doi = true;
        }
        if (doi) { cu.ts = Date.now(); boSung++; } else boQua++;
        continue;
      }

      // Mục mới: KHÔNG chép tiến độ ôn của người gửi sang. Đây là từ mới đối với
      // người nhận, phải vào sóng ôn tập từ đầu.
      const ne = { word: tu, reading: o(h, "Furigana"), means: nghia, dict: huong, ts: Date.now() };
      if (o(h, "Ghi chú")) ne.note = o(h, "Ghi chú");
      if (o(h, "Loại") === "câu") ne.kind = "sent";
      if (o(h, "Phát âm")) ne.audio = o(h, "Phát âm");
      if (src.url) ne.src = src;
      const rb = o(h, "Furigana theo chữ Hán").split(/\s+/).filter(Boolean);
      if (rb.length) { ne.ruby = rb; ne.docSuy = 1; }
      const so = o(h, "Sổ");
      if (so) {
        if (!tenSo[so]) {
          const id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          dks[id] = { name: so, ts: Date.now() };
          tenSo[so] = id;
        }
        ne.deck = tenSo[so];
      }
      window.Muc.nhatLaiBanSua(ne, cu);      // từng xoá thì nhặt lại phần mình tự viết
      nb[key] = ne;
      them++;
    }
  });

  await load();
  syncSoon();
  const bao = T2("Đã nạp: thêm {them} từ mới, bổ sung {bs} từ đã có, bỏ qua {bq} từ trùng.",
    { them: them, bs: boSung, bq: boQua });
  setStatus(bao);
  toast(bao);
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
/**
 * Gộp hai kho mục. Mốc nào mới hơn thì đè, RIÊNG tiến độ ôn so bằng mốc của
 * lần chấm bài — xem `Muc.tron` trong muc.js để biết vì sao phải tách ra.
 */
function mergeLocal(a, b) {
  return window.Muc.tron(a, b);
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
      // Trộn TỪNG NGÔN NGỮ một. TienDo.tron() chỉ hiểu một bản tiến độ phẳng;
      // ném cả cục {ja, en} vào là nó trả về bản trắng, vừa mất tiến độ đang có
      // vừa mất tiến độ trong file. Ngu.tachHoc() cũng nhận cả file sao lưu đời
      // cũ (một bản phẳng, hồi còn là app tiếng Anh) và xếp đúng ngăn.
      const cur = window.Ngu.tachHoc((await chrome.storage.local.get("hoc")).hoc);
      const vao = window.Ngu.tachHoc(imp.hoc);
      const gop = {
        ja: window.TienDo.tron(cur.ja, vao.ja),
        en: window.TienDo.tron(cur.en, vao.en)
      };
      await chrome.storage.local.set({ hoc: gop });
      nguDaNap = NGU;
      theoDoi.dat(gop[NGU]);
    }
    await load();
    syncSoon();
    setStatus(T("Đã nạp file và trộn vào sổ tay."));
    toast(T("Đã nạp file sao lưu"));
  } catch (e) {
    setStatus(T("File không hợp lệ."));
    toast(T("File không hợp lệ"), "bad");
  }
}

async function clearAll() {
  const list = currentActiveSet();
  if (!list.length) return;
  const where = current === ALL ? T("toàn bộ sổ tay")
    : ('mục "' + (current === NONE ? T("Chưa phân loại") : (deckName(current) || T("đang chọn"))) + '"');
  if (!confirm(T2("Xoá {n} mục trong {noi}? Việc xoá cũng đồng bộ sang máy khác.", { n: list.length, noi: where }))) return;
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
  const c = window.Ngu.KHOA_CHUNG;
  const kho = await chrome.storage.local.get([k.url, k.token, c.url, c.token]);
  $("syncUrl").value = kho[k.url] || "";
  $("syncToken").value = kho[k.token] || "";
  if ($("syncUrlChung")) {
    $("syncUrlChung").value = kho[c.url] || "";
    $("syncTokenChung").value = kho[c.token] || "";
    $("syncChungBat").checked = !!kho[c.url];
    veKhoChung();
  }
  const nh = $("syncNhan");
  if (nh) nh.textContent = T2("Đang cấu hình cloud tiếng {ngu}", { ngu: T(window.Ngu.ten(NGU)) });
  return { syncUrl: kho[k.url], syncToken: kho[k.token] };
}
/*
 * Bật kho chung thì ô riêng của từng ngôn ngữ mờ đi — không xoá, chỉ mờ. Người
 * dùng có thể tắt kho chung để về nếp cũ, và lúc ấy cấu hình cũ vẫn còn nguyên.
 */
function veKhoChung() {
  const bat = $("syncChungBat") && $("syncChungBat").checked;
  if ($("syncChungO")) $("syncChungO").style.display = bat ? "" : "none";
  [$("syncUrl"), $("syncToken")].forEach((o) => {
    if (!o) return;
    o.disabled = !!bat;
    o.style.opacity = bat ? "0.45" : "";
    o.title = bat ? T("Đang dùng kho chung — ô này tạm nghỉ") : "";
  });
}

async function saveConfig() {
  const k = window.Ngu.khoaSync(NGU);
  const c = window.Ngu.KHOA_CHUNG;
  if ($("syncChungBat")) {
    const bat = $("syncChungBat").checked;
    await chrome.storage.local.set({
      [c.url]: bat ? $("syncUrlChung").value.trim() : "",
      [c.token]: bat ? $("syncTokenChung").value.trim() : ""
    });
  }
  const syncUrl = $("syncUrl").value.trim();
  const syncToken = $("syncToken").value.trim();
  await chrome.storage.local.set({ [k.url]: syncUrl, [k.token]: syncToken });
  setStatus(syncUrl
    ? T2("Đã lưu cấu hình đồng bộ cho tiếng {ngu}.", { ngu: T(window.Ngu.ten(NGU)) })
    : T2("Đã xoá cấu hình tiếng {ngu}.", { ngu: T(window.Ngu.ten(NGU)) }));
}

/**
 * Gộp dữ liệu từ hai cloud cũ về kho chung.
 *
 * Đọc cả hai cloud cũ, hợp với sổ đang có trên máy, rồi ghi vào kho chung. Phép
 * hợp dùng đúng Muc.tron của lượt đồng bộ thường, nên KHÔNG bên nào bị đè mất:
 * máy này giữ tiếng Nhật, máy kia giữ tiếng Anh, gộp xong có cả hai.
 *
 * Chạy trong service worker chứ không ở đây, vì chỉ bên ấy mới có driveRequest
 * và biết đường ra Drive.
 */
async function gopCloudCu() {
  const st = $("gopStatus");
  const url = $("syncUrlChung").value.trim();
  if (!url) { if (st) st.textContent = T("Hãy điền URL kho chung trước đã."); return; }
  await saveConfig();
  if (st) st.textContent = T("Đang gộp…");
  chrome.runtime.sendMessage({ type: "GOP_CLOUD" }, async (res) => {
    if (chrome.runtime.lastError) { if (st) st.textContent = T2("Lỗi: {loi}", { loi: chrome.runtime.lastError.message }); return; }
    if (!res || !res.ok) { if (st) st.textContent = T2("Lỗi: {loi}", { loi: (res && res.error) || "?" }); return; }
    if (st) st.textContent = T2("Xong — kho chung giờ có {n} mục.", { n: res.n });
    await load();
  });
}

function syncNow() {
  setStatus(T("Đang đồng bộ…"));
  const cua = NGU;   // đổi ngôn ngữ giữa chừng thì kết quả cũ không được ghi đè
  return new Promise((xong) => {
    chrome.runtime.sendMessage({ type: "SYNC_NOW", ngu: cua }, async (res) => {
      if (chrome.runtime.lastError) { setStatus(T2("Lỗi: {loi}", { loi: chrome.runtime.lastError.message })); xong(); return; }
      if (res && res.ok) {
        if (cua === NGU) {
          await theoDoi.nap(true);
          await load();
          if ($("viewProgress").classList.contains("show")) veTienDo();
          setStatus(T2("Đã đồng bộ · {n} mục · {gio}", { n: res.count, gio: new Date().toLocaleTimeString() }));
        }
      } else {
        setStatus(T2("Không đồng bộ được: {loi}", { loi: (res && res.error) || T("lỗi không rõ") }));
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

const SET_DEFAULTS = { inline: true, requireCtrl: false, maxLen: 30, translate: true, maxSent: 400,
                       ytTuBat: false, ytPhoi: true, nhip: true, nhipToc: 320, nhacPhut: 0, coVu: true, nhacTau: true, tach: true };

/**
 * Bản cài đặt đang dùng, giữ sẵn trong bộ nhớ.
 *
 * `revealCard()` chạy đồng bộ ngay lúc bấm — không thể đợi một lượt đọc
 * chrome.storage rồi mới bật hiệu ứng, đợi là thẻ lật xong mới thấy nhịp chạy.
 * Nên bản cài đặt được nạp một lần lúc mở trang và cập nhật lại mỗi lần Lưu.
 */
let CAI = Object.assign({}, SET_DEFAULTS);

async function loadSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  const S = Object.assign({}, SET_DEFAULTS, settings || {});
  CAI = S;
  if ($("setNhip")) $("setNhip").checked = S.nhip !== false;
  if ($("setNhipToc")) $("setNhipToc").value = S.nhipToc || 320;
  if ($("setNhac")) $("setNhac").value = S.nhacPhut || 0;
  if ($("setCoVu")) $("setCoVu").checked = S.coVu !== false;
  if ($("setNhacTau")) $("setNhacTau").checked = S.nhacTau !== false;
  if ($("setTach")) $("setTach").checked = S.tach !== false;
  datLoiNhac();
  $("setInline").checked = !!S.inline;
  $("setCtrl").checked = !!S.requireCtrl;
  $("setLen").value = S.maxLen || 30;
  $("setTrans").checked = S.translate !== false;
  if ($("setYtAuto")) $("setYtAuto").checked = !!S.ytTuBat;
  if ($("setYtPhoi")) $("setYtPhoi").checked = S.ytPhoi !== false;
}
async function saveSettings() {
  // GỘP lên cấu hình cũ, không ghi đè cả cục: ngôn ngữ tra (ngu) và ngôn ngữ
  // giao diện (chu) cũng nằm trong "settings" — ghi một object mới trơ sẽ xoá
  // sạch chúng.
  const { settings } = await chrome.storage.local.get("settings");
  await chrome.storage.local.set({
    settings: Object.assign({}, settings || {}, {
      inline: $("setInline").checked,
      requireCtrl: $("setCtrl").checked,
      maxLen: Math.max(5, Math.min(200, parseInt($("setLen").value, 10) || 30)),
      translate: $("setTrans").checked,
      maxSent: 400,
      ytTuBat: $("setYtAuto") ? $("setYtAuto").checked : false,
      ytPhoi: $("setYtPhoi") ? $("setYtPhoi").checked : true,
      nhip: $("setNhip") ? $("setNhip").checked : true,
      nhipToc: nhipTocHopLe($("setNhipToc") ? $("setNhipToc").value : 0),
      nhacPhut: Math.max(0, Math.min(240, parseInt(($("setNhac") || {}).value, 10) || 0)),
      coVu: $("setCoVu") ? $("setCoVu").checked : true,
      nhacTau: $("setNhacTau") ? $("setNhacTau").checked : true,
      tach: $("setTach") ? $("setTach").checked : true
    })
  });
  // Đọc lại để CAI và đồng hồ nhắc khớp với thứ vừa lưu — sửa số phút xong mà
  // vẫn phải chờ nốt chu kỳ cũ thì rất khó hiểu.
  await loadSettings();
  $("setStatus").textContent = T("Đã lưu. Tải lại trang web đang mở để áp dụng ngay.");
}
async function clearCache() {
  await chrome.storage.local.set({ cache: {}, trCache: {} });
  $("setStatus").textContent = T("Đã xoá bộ nhớ đệm tra từ.");
}

/* ==================================================================== */
/* Luyện nói                                                            */
/* ==================================================================== */
/*
 * Nghe rồi đọc theo từng câu lời thoại là một chuyện; nói cả một đoạn của CHÍNH
 * MÌNH lại là chuyện khác — đó mới là lúc phải tự sắp ý, tự chọn chữ, và vấp ở
 * đúng những chỗ mình yếu. Nên trang này nhận một đoạn bất kỳ người dùng viết
 * ra, dịch sang thứ tiếng kia, rồi đặt hai bản cạnh nhau: mỗi bên một nút loa để
 * nghe giọng máy, một nút thu để đọc lại, và nghe hai giọng nối tiếp nhau là ra
 * ngay chỗ ngữ điệu lệch.
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

async function docDoanNoi() {
  const { luyenNoi } = await chrome.storage.local.get("luyenNoi");
  return luyenNoi || {};
}
async function ghiDoanNoi(d) { await chrome.storage.local.set({ luyenNoi: d }); }

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
 *
 * Dùng chung cho cả tiêu đề lẫn hai mặt của đoạn, nên ba chỗ ấy hành xử giống
 * hệt nhau — Enter lưu, Esc huỷ, và bấm ra ngoài thì không mất chữ.
 */
function suaTaiCho(oCu, giaTri, motDong, luu) {
  const hop = el("div", "spedit");
  const o = document.createElement(motDong ? "input" : "textarea");
  if (motDong) o.type = "text"; else o.rows = Math.min(8, Math.max(3, Math.ceil(giaTri.length / 60)));
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

/**
 * Sửa một mặt của đoạn, rồi DỊCH LẠI mặt kia cho khớp.
 *
 * Sửa xong mà để mặt kia y nguyên thì hai bản nói hai chuyện khác nhau — mà cả
 * trang này dựng lên chỉ để đặt hai bản cạnh nhau mà so. Nên sửa bên nào cũng
 * được, và bên còn lại tự chạy theo.
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

  const dich = await new Promise((xong) => {
    chrome.runtime.sendMessage({ type: "TRANSLATE", text: chuMoi, from: ngu, to: nguKia }, (res) => {
      if (chrome.runtime.lastError || !res || res.ok === false) { xong(""); return; }
      xong(res.text || "");
    });
  });

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

  const loa = nutIcon("speaker-high", T2("Nghe giọng máy đọc ({ngu})", { ngu: nhan }), "", 18);
  loa.addEventListener("click", () => ttsSpeak(chu, ngu));
  dau.appendChild(loa);

  const sua = nutIcon("pencil-simple", T("Sửa đoạn này — bản kia sẽ tự dịch lại theo"), "", 17);
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
  // Chỉ những đoạn của ngôn ngữ đang bật: đang học tiếng Nhật mà lẫn vào mấy
  // đoạn tiếng Anh thì trang này loãng ngay.
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

    /* Tiêu đề: để mấy chục bài nói còn phân ra được theo chủ đề. Bấm vào là sửa
       ngay tại chỗ — đặt tên bài thường là việc nghĩ lại sau khi đã viết xong. */
    const hangTen = el("div", "sptophead");
    const oTen = el("div", "sptitle" + (x.tieuDe ? "" : " trong"),
      x.tieuDe || T("(chưa đặt tên)"));
    hangTen.appendChild(oTen);
    const suaTen = nutIcon("pencil-simple", T("Đổi tên bài nói"), "", 15);
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

    const chan = el("div", "rowx", "");
    chan.style.cssText = "gap:8px;margin-top:10px;align-items:center";
    chan.appendChild(el("span", "t-tiny faint grow", fmtDate(x.suaLuc || x.ts)));
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

  const huong = $("spDir").value;
  const mo = (HUONG_NOI[NGU] || HUONG_NOI.en).find((x) => x[0] === huong);
  if (!mo) return;
  const [, , tuNgu, sangNgu] = mo;

  nut.disabled = true;
  bao.textContent = T("Đang dịch…");
  chrome.runtime.sendMessage({ type: "TRANSLATE", text: chu, from: tuNgu, to: sangNgu }, async (res) => {
    nut.disabled = false;
    if (chrome.runtime.lastError || !res || res.ok === false || !res.text) {
      bao.textContent = T("Chưa dịch được — kiểm tra mạng rồi thử lại.");
      return;
    }
    const id = "n_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const kho = await docDoanNoi();
    const oTen = $("spTitle");
    kho[id] = { id, tieuDe: (oTen && oTen.value.trim()) || "", goc: chu, dich: res.text,
                tuNgu, sangNgu, ts: Date.now() };
    await ghiDoanNoi(kho);
    if (oTen) oTen.value = "";
    oChu.value = "";
    bao.textContent = "";
    veLuyenNoi();
  });
}

/* ==================================================================== */
/* Chuyển màn Sổ tay / Tiến độ                                          */
/* ==================================================================== */

function moMan(ten) {
  $("viewList").classList.toggle("show", ten === "list");
  $("viewProgress").classList.toggle("show", ten === "progress");
  $("viewSpeak").classList.toggle("show", ten === "speak");
  // Hai nút trên đầu chỉ nói về Sổ tay / Tiến độ; Luyện nói vào bằng nút riêng
  // của nó, nên lúc đang ở đó thì không nút nào sáng cả.
  $("pageList").classList.toggle("active", ten === "list");
  $("pageProgress").classList.toggle("active", ten === "progress");
  if (ten === "progress") veTienDo();
  if (ten === "speak") veLuyenNoi();
}
$("pageList").addEventListener("click", () => moMan("list"));
$("pageProgress").addEventListener("click", () => moMan("progress"));
$("speak").addEventListener("click", () => moMan("speak"));
$("spAdd").addEventListener("click", themDoanNoi);

/* ==================================================================== */
/* Gắn icon vào phần khung tĩnh của HTML                                */
/* ==================================================================== */

/*
 * gaiIcon() dựng lại nội dung mấy cái nút bằng innerHTML, xoá luôn phần đánh
 * dấu data-chu viết sẵn trong HTML. Nên nhãn do nó tạo ra phải tự mang dấu:
 * `<span class="lb" data-chu>`. Xem chu.js.
 */
function gaiIcon() {
  $("brandMark").innerHTML = window.Icon("notebook", { size: 21, weight: "solid" });
  $("icTool").innerHTML = window.Icon("export", { size: 18 });
  $("icSync").innerHTML = window.Icon("cloud-arrow-up", { size: 18 });
  $("icSet").innerHTML = window.Icon("gear-six", { size: 18 });
  ["cr1", "cr2", "cr3"].forEach((id) => { $(id).innerHTML = window.Icon("caret-right", { size: 16 }); });

  $("ebDecks").innerHTML = window.Icon("folder-simple", { size: 15 }) + "<span data-chu>Sổ con</span>";
  $("pageList").innerHTML = window.Icon("notebook", { size: 17 }) + '<span class="lb" data-chu>Sổ tay</span>';
  $("pageProgress").innerHTML = window.Icon("chart-line-up", { size: 17 }) + '<span class="lb" data-chu>Tiến độ</span>';

  const st = $("study");
  const den = st.querySelector(".tag");
  // Chỗ ghi tên ngăn sắp ôn phải dựng Ở ĐÂY chứ không đặt sẵn trong HTML: dòng
  // dưới thay trắng ruột cái nút, thẻ nào đặt sẵn cũng bay theo.
  st.innerHTML = window.Icon("graduation-cap", { size: 20 }) + '<span class="lb" data-chu>Học ngay</span>';
  st.appendChild(el("span", "lb scope", ""));
  st.appendChild(den);

  $("filter").parentElement.insertBefore(ic("magnifying-glass", { size: 18 }), $("filter"));

  $("stSpk").innerHTML = window.Icon("speaker-high", { size: 22 });
  const gan = (id, ten, chu) => {
    const b = $(id);
    b.innerHTML = window.Icon(ten, { size: 15 }) + '<span class="lb" data-chu>' + chu + "</span>";
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
$("exChiaSe").addEventListener("click", exportChiaSe);
$("napChiaSe").addEventListener("click", () => $("napChiaSeFile").click());
$("napChiaSeFile").addEventListener("change", (e) => {
  if (e.target.files[0]) napChiaSeFile(e.target.files[0]);
  e.target.value = "";
});
$("restore").addEventListener("click", () => $("restoreFile").click());
$("restoreFile").addEventListener("change", (e) => {
  if (e.target.files[0]) restoreJson(e.target.files[0]);
  e.target.value = "";
});
$("clear").addEventListener("click", clearAll);
$("renameDeck").addEventListener("click", renameDeck);
$("deleteDeck").addEventListener("click", deleteDeck);
$("saveCfg").addEventListener("click", saveConfig);
if ($("syncChungBat")) $("syncChungBat").addEventListener("change", veKhoChung);
if ($("gopCloud")) $("gopCloud").addEventListener("click", gopCloudCu);
$("syncNow").addEventListener("click", syncNow);
/**
 * Nói thật về phím tắt.
 *
 * Chrome giữ riêng một số tổ hợp cho chính nó — Ctrl+Shift+N là "cửa sổ ẩn
 * danh", Ctrl+Shift+T là "mở lại tab vừa đóng", Ctrl+Shift+W là "đóng cửa sổ".
 * Gán extension vào mấy phím đó thì Chrome BỎ QUA MÀ KHÔNG BÁO GÌ: trong khai
 * báo vẫn thấy phím, nhưng bấm thì không có gì xảy ra. Extension khác giành mất
 * phím cũng hỏng y như vậy, và cũng im lặng y như vậy.
 *
 * Nên hỏi thẳng Chrome xem phím tắt THẬT SỰ đang là gì, rồi hiện ra.
 */
async function veChuPhimTat() {
  const o = $("oPhimTat");
  if (!o) return;
  try {
    const ds = await chrome.commands.getAll();
    const c = (ds || []).find((x) => x.name === "_execute_action");
    const phim = c && c.shortcut;
    // Trên trang web thường, Ctrl+Shift+Z được bắt thẳng trong trang nên chạy
    // ngay dù Chrome có gán lệnh hay không. Lệnh gốc này CHỈ cần cho một chỗ:
    // xem PDF — nơi content script không chạy được.
    if (phim) {
      o.textContent = T2("Phím tắt tra nhanh: {phim}. Trang web thường thì Ctrl+Shift+Z chạy sẵn; lệnh này để tra ngay cả trong PDF.", { phim: phim });
      o.className = "t-tiny faint";
    } else {
      o.textContent = T("Trên trang web thường, Ctrl+Shift+Z đã chạy sẵn. Nhưng để tra trong PDF thì cần lệnh gốc, mà Chrome không tự gán lại cho bản đã cài. Bấm nút dưới rồi đặt Ctrl+Shift+Z cho “Mở popup”, hoặc gỡ ra cài lại extension.");
      o.className = "t-tiny";
      o.style.color = "var(--bad, #c0392b)";
    }
  } catch (e) { o.textContent = ""; }
}

$("doiPhimTat").addEventListener("click", () => {
  // Trang này chỉ mở được từ trong extension, dán vào thanh địa chỉ thì Chrome chặn.
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});
veChuPhimTat();

$("saveSet").addEventListener("click", saveSettings);
$("clearCache").addEventListener("click", clearCache);
// Nghe thử: chỉnh âm lượng loa cho vừa tai TRƯỚC khi vào học, chứ đang học mà
// nhạc vang to quá thì lúc mò nút đã mất mạch rồi.
if ($("nghThu")) $("nghThu").addEventListener("click", () => {
  const t = window.NhacTau && window.NhacTau.phatMot();
  if (t) $("setStatus").textContent = T2("Đang phát: nhạc ga {ten}", { ten: t.ten });
});

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
    chrome.runtime.sendMessage({ type: "VA_FURIGANA", toiDa: 60 }, (kq) => {
      if (chrome.runtime.lastError) return;
      if (kq && kq.ok && kq.count) load();
    });
  } catch (e) { /* không vá được thì thôi, sổ vẫn dùng bình thường */ }
}

/* ==================================================================== */
/* Ngôn ngữ giao diện                                                    */
/* ==================================================================== */
/*
 * Khác hẳn nút Anh – Việt / Nhật – Việt: cái đó chọn TỪ ĐIỂN nào, còn cái này
 * chỉ đổi chữ trên màn hình. Một người Nhật học tiếng Việt vẫn có thể để giao
 * diện tiếng Nhật mà tra Việt–Anh.
 */
async function napChu() {
  const { settings } = await chrome.storage.local.get("settings");
  const c = window.Chu.hopLe((settings || {}).chu);
  $("chuNgu").value = c;
  window.Chu.dat(c);
  return c;
}
$("chuNgu").addEventListener("change", async () => {
  const c = window.Chu.hopLe($("chuNgu").value);
  const { settings } = await chrome.storage.local.get("settings");
  await chrome.storage.local.set({ settings: Object.assign({}, settings || {}, { chu: c }) });
  window.Chu.dat(c);
  // Những chỗ do JS dựng ra không nằm trong lượt quét DOM, phải vẽ lại.
  veNgu();
  await load();
});

/** Vẽ lại nút chuyển ngôn ngữ và mọi chỗ ăn theo nó. */
function veNgu() {
  $("nguEn").classList.toggle("active", NGU === "en");
  $("nguJa").classList.toggle("active", NGU === "ja");
  const sb = $("brandSub");
  if (sb) sb.textContent = T2("{ngu} · sóng học tập", { ngu: NGU === "ja" ? T("Nhật – Việt") : T("Anh – Việt") });
  // Hướng dẫn đọc IPA chỉ có nghĩa với tiếng Anh.
  const ipa = $("ipaGuide");
  if (ipa) ipa.style.display = NGU === "ja" ? "none" : "";
  document.title = (NGU === "ja" ? T("Sổ tay Nhật – Việt") : T("Sổ tay Anh – Việt")) + " · NeutronDict";
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
  await napChu();      // sau gaiIcon: nhãn do nó dựng ra mới có mặt để dịch
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
