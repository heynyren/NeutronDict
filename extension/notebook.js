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
  t.textContent = "";
  t.appendChild(ic(kieu === "bad" ? "warning-circle" : "check-circle", { size: 18, weight: "solid" }));
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
  // Có nút thì để lâu hơn: 3,2 giây vừa đủ ĐỌC, chưa đủ để quyết định rồi bấm.
  toastTimer = setTimeout(() => t.classList.remove("show"), hanhDong ? 6500 : 3200);
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
const DONGBANG = "__freeze__";   // sổ con ảo: những từ đã rút khỏi vòng ôn

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
  const chay = hangDoiGhi.then(() => window.KhoGhi.chay(fn));
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

/**
 * Như capNhat, nhưng KHÔNG ghi gì khi fn báo là chẳng có gì đổi.
 *
 * Khóa chung bảo vệ cả trang và nền. Chỉ ghi khi có thay đổi vẫn cần thiết
 * để tránh phát sự kiện lưu và nạp lại giao diện khi dữ liệu không đổi.
 * Nên mỗi lượt "đọc cả sổ rồi ghi cả sổ" của trang là một cửa sổ để đè mất thứ
 * nền vừa ghi xong.
 *
 * Đo được: mở sổ với ba từ, nền bồi xong cả ba (mỗi lượt đều báo ghi thành
 * công), mà kết quả cuối chỉ còn một — vì load() chạy lại mấy lần và lần nào
 * cũng ghi đè bản nó đọc từ trước đó, DÙ NÓ KHÔNG SỬA GÌ CẢ.
 *
 * Không ghi khi không sửa thì cửa sổ ấy biến mất trong hầu hết các lượt.
 */
function capNhatNeuDoi(fn) {
  return suaSoTay(async () => {
    const s = await getStore();
    const doi = await fn(s.nb, s.decks);
    if (!doi) return false;
    await chrome.storage.local.set({ notebook: s.nb, decks: s.decks });
    return true;
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
/* -------------------------------------------------------------------- */
/* Ôn kèm cả cụm                                                         */
/* -------------------------------------------------------------------- */
/**
 * Hàng đợi của một buổi học: mảng các KHỐI, mỗi khối là các thẻ của MỘT từ.
 *
 * Mỗi từ chỉ có một đường tới hạn mỗi lần (Srs.denHan), nên một khối thường chỉ có
 * một thẻ. Vẫn trả về khối để `startStudy` xáo theo khối như trước.
 *
 * @returns {Array<Array>} mỗi phần tử là một khối thẻ
 */
function hangDoiKhoi(scopeList) {
  const now = Date.now();
  const khoi = [];
  for (const it of scopeList) {
    if (it.del) continue;
    const han = window.Srs.denHan(it, now);
    if (han.length) khoi.push(han.map((d) => Object.assign({}, it, { _d: d })));
  }
  return khoi;
}

/** Bản phẳng, cho những chỗ chỉ cần đếm. */
function hangDoi(scopeList) {
  const ra = [];
  for (const k of hangDoiKhoi(scopeList, null)) for (const x of k) ra.push(x);
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
  if (duong === "dien") return T("chưa có câu nguồn đã dịch");
  return T("chưa có dữ liệu");
}

/** Một dòng gọn cho chip: "72 · Nghe ra". */
function chuDiem(it) {
  const d = window.Srs.diemTu(it);
  return d.tong + " · " + T(d.ten);
}

/**
 * Đường này ĐÃ tới hạn theo lịch riêng của nó chưa (chưa tính luật 12 tiếng giữa
 * các đường — xem Srs.GIAN_DUONG). Đường chưa học bao giờ coi là đã tới hạn.
 */
function daDenHan(it, duong, now) {
  const due = window.Srs.hanDuong(it, duong);
  return !due || due <= (now || Date.now());
}

/** "20:15", hoặc "mai 08:15" nếu sang ngày khác — để nói đường kế tiếp hiện lúc nào. */
function gioHien(ms, now) {
  const d = new Date(ms), h = new Date(now || Date.now());
  const gio = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === h.toDateString() ? gio : T("mai") + " " + gio;
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
  // Đường kế tiếp sẽ hiện (theo thứ tự DUONG) trong số những đường đang ngủ vì luật 12 tiếng.
  const daiDuong = window.Srs.DUONG.find((t) => d.phan[t] !== null && mo.indexOf(t) >= 0
    && !window.Srs.biDongBang(it, t) && daDenHan(it, t, nay) && window.Srs.choDen(it, t, nay));
  return window.Srs.DUONG.map((t) => {
    const x = (it.duong || {})[t];
    const co = d.phan[t] !== null;
    let trangThai;
    if (!co) trangThai = coSaoThieu(t);
    else if (window.Srs.biDongBang(it, t)) trangThai = T("đang đóng băng");
    else if (mo.indexOf(t) < 0) trangThai = T("chưa mở");
    else if (han.indexOf(t) >= 0) trangThai = T("đến hạn");
    else if (daDenHan(it, t, nay) && window.Srs.choDen(it, t, nay))
      // Các đường chờ nhau theo chuỗi: chỉ đường ĐẦU HÀNG có giờ hiện cụ thể, những
      // đường sau phải đợi tới khi đường ấy được chấm (rồi 12 tiếng nữa).
      trangThai = t === daiDuong
        ? T2("hiện lúc {gio}", { gio: gioHien(window.Srs.choDen(it, t, nay), nay) })
        : T("đến hạn — đợi tới lượt");
    else if (daDenHan(it, t, nay)) trangThai = T("đến hạn — đợi tới lượt");
    else trangThai = khiNaoOn(window.Srs.hanDuong(it, t), nay);
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
  let cuoi = d.chuaDo.length
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
  // Vừa chấm một đường của từ này: các đường còn lại ngủ 12 tiếng (Srs.GIAN_DUONG),
  // và nút "Ôn bài còn lại" không được là lối tắt vòng qua luật ấy.
  if (window.Srs.DUONG.some((t) => window.Srs.choDen(it, t, nay))) return [];
  const mo = window.Srs.duongMo(it);
  const han = window.Srs.denHan(it, nay);
  return window.Srs.duongCo(it).filter((t) =>
    !window.Srs.biChan(it, t, nay) && mo.indexOf(t) >= 0 && (han.indexOf(t) >= 0 || window.Srs.ngayCua((it.duong || {})[t]) === 0));
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

  // Nói thẳng chiều nào chưa đo được, để cái nhãn kia không bị đọc thành một
  // lời hứa rộng hơn những gì thật sự đã chứng minh.
  $("dsChuaDo").textContent = d.chuaDo.length
    ? T2("Chưa đo được: {ds} — nhãn ở trên chỉ nói tới phần đã đo.",
         { ds: d.chuaDo.map((x) => T(x)).join(", ") })
    : "";

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
$("dsOn").addEventListener("click", () => {
  const it = diemDangXem;
  if (!it) return;
  const ds = duongOnDuoc(it, Date.now());
  dongBangDiem();
  if (ds.length) hocRieng(it, ds);
});

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
/**
 * @param {number} [chat] 0..1 — làm đúng được mấy phần, cho những bài chấm theo
 *   phần (hai bài liên kết). Bỏ trống thì chỉ có nhớ/quên, xem Srs.heChatLuong.
 */
/**
 * Mã của MÁY NÀY — dựng một lần rồi giữ nguyên.
 *
 * Bảng số đo SRS là những con số cộng dồn, nên mỗi máy phải ghi vào nhánh riêng
 * của nó; gộp hai máy là giữ nguyên từng nhánh chứ không cộng, và chỉ cộng lúc
 * đọc. Xem Srs.ghiSoDo. Không có mã riêng thì hai máy ghi đè lên nhau và mất
 * một nửa số đo.
 */
let _maMay = null;
async function maMay() {
  if (_maMay) return _maMay;
  const kho = await chrome.storage.local.get("maMay");
  if (kho.maMay) { _maMay = kho.maMay; return _maMay; }
  _maMay = "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  await chrome.storage.local.set({ maMay: _maMay });
  return _maMay;
}

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
  return suaSoTay(async () => {
    // Đọc lịch, nhịp và số đo mới nhất SAU khi đã có khóa chung.
    const kho = await chrome.storage.local.get(["notebook", "nhipMs", "soDoSrs"]);
    const nb = kho.notebook || {};
    const e = nb[key];
    if (!e || e.del || window.Srs.biChan(e, d, Date.now())) return null;
    const tkAll = kho.nhipMs || {};
    const tkTruoc = Object.assign({}, tkAll[d] || {});
    const lich = window.Srs.lichHen(Object.values(nb));
    const cu = (e.duong && e.duong[d]) || null;
    const batDau = cu || (d === "nhin" && e.srs ? { lv: e.srs.lv } : null);
    const truoc = cu ? Object.assign({}, cu) : null;
    const ngayCho = batDau && batDau.ts ? (Date.now() - batDau.ts) / 86400000 : 0;
    const lvTruoc = batDau && typeof batDau.lv === "number" ? batDau.lv : -1;
    let kq = window.Srs.cham(batDau, remembered, ms || 0, tkAll[d], Date.now(), d,
                             Math.random(), chat, lich);
    kq = window.Srs.phoiHop(e, d, kq, remembered, Date.now(), lich);
    const moi = Object.assign({}, e, {
      duong: Object.assign({}, e.duong || {}, { [d]: kq.duong }),
      ts: Date.now()
    });
    /*
     * ĐẠT MỨC TỐI ĐA THÌ ĐÓNG BĂNG.
     *
     * Chỉ xét ở lượt NHỚ: quên thì nới ngày đã tụt xuống, `toiDa` tự sai. Đóng
     * băng là cờ như mọi lần bấm tay — nút "Đang đóng băng" mở lại được, và từ
     * mở lại sẽ chỉ tới hạn khi hết cả năm, nên không có chuyện bị đóng băng
     * lại ngay vòng sau. Cờ `_toiDa` chỉ để chỗ gọi báo cho người học biết.
     */
    let vuaToiDa = false;
    if (remembered && !moi.dongBang && window.Srs.toiDa(moi)) { moi.dongBang = 1; vuaToiDa = true; }
    moi.srs = window.Srs.gomSrs(moi) || { lv: -1, due: Date.now(), ts: Date.now() };
    nb[key] = moi;
    tkAll[d] = kq.tk;
    const ghi = { notebook: nb, nhipMs: tkAll };
    if (ngayCho > 0) {
      ghi.soDoSrs = window.Srs.ghiSoDo(kho.soDoSrs || {}, d, lvTruoc, ngayCho,
        !!remembered, (await maMay()) + "·g2");
    }
    // Một lượt ghi giữ lịch và thống kê tương ứng với cùng một lần chấm.
    await chrome.storage.local.set(ghi);
    nhipMs = tkAll;
    return Object.assign({}, kq, { truoc: truoc, tkTruoc: tkTruoc, vuaToiDa: vuaToiDa });
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

/*
 * NÚT "HỌC" KHÔNG ĐƯỢC PHÁN KHI SỔ CHƯA VỀ.
 *
 * `items` bắt đầu là mảng rỗng và chỉ có dữ liệu sau khi load() đọc xong kho.
 * Trong khoảng ấy, bấm Học thì hangDoi() trả rỗng và app báo "Không có mục nào
 * đến hạn" — trên một quyển sổ đầy từ tới hạn. Người dùng đọc câu ấy rồi đóng
 * app, đúng như báo lại: "không vào được chế độ học".
 *
 * Khoảng nói dối ấy giãn theo cỡ sổ. Đo được:
 *      40 từ ->   109ms
 *     400 từ ->   569ms
 *   2.000 từ -> 2.864ms
 *
 * Gần ba giây trên một quyển sổ cỡ thật — thừa sức để một người bấm trúng, và
 * máy nào chậm hơn một chút thì trúng thường xuyên hơn hẳn. Đây chính là loại
 * lỗi "máy này thì được, máy kia thì không" mà không đụng gì tới mã.
 *
 * Nên giữ lại LỜI HỨA của lượt nạp đang chạy: ai cần dữ liệu thật thì chờ nó,
 * đừng ai phán khi tay chưa có gì.
 */
/** Sổ đã được đọc xong ít nhất một lần chưa. */
let daNapXong = false;
/*
 * Lời hứa dựng NGAY LÚC NẠP TỆP, không phải lúc load() được gọi lần đầu.
 *
 * Bản vá đầu của tôi chỉ giữ lời hứa của lượt nạp ĐANG CHẠY, nên bấm trúng lúc
 * trang còn chưa kịp gọi load() thì chẳng có lời hứa nào để chờ — và nút vẫn
 * nói dối y như cũ. Bài dò vẫn rớt ở mốc 0ms. Dựng sẵn từ đầu thì không còn kẽ
 * hở nào: bấm sớm cỡ nào cũng có thứ để chờ.
 */
let moNapDau;
const huaNapDau = new Promise((r) => { moNapDau = r; });

/** Trần chờ. Sổ hỏng tới mức không nạp nổi thì vẫn phải cho người ta bấm tiếp. */
const HAN_CHO_NAP = 10000;

/** Chờ cho tới khi sổ tay thật sự có trong tay. */
function choNapXong() {
  if (daNapXong) return Promise.resolve();
  return Promise.race([huaNapDau, new Promise((r) => setTimeout(r, HAN_CHO_NAP))]);
}

/*
 * Ngôn ngữ đã được đọc từ cài đặt chưa.
 *
 * `NGU` khởi đầu là "en" và chỉ được đặt đúng sau vài lượt `await` lúc khởi động.
 * Nhưng `load()` còn được gọi từ chỗ khác (tin nhắn "vá furigana xong" của nền…),
 * và nếu nó chạy TRƯỚC khi `NGU` có giá trị thật thì lọc sổ theo "en" — trên sổ
 * tiếng Nhật là ra 0 mục — rồi vẫn đánh dấu `daNapXong`. Nút Học khi ấy thấy "đã
 * nạp xong" và báo "không có mục nào đến hạn" trên một quyển sổ đầy từ tới hạn.
 * Lỗi này có từ trước; bản cũ nạp chậm nên lượt chạy sớm hầu như luôn bị lượt
 * khởi động đè lên, còn giờ nạp nhanh thì nó lộ ra. Nên mọi lượt nạp đều chờ ở đây.
 */
let nguSanSang;
const huaNgu = new Promise((r) => { nguSanSang = r; });

function load() {
  return (async () => {
    // Trần chờ: cài đặt hỏng tới mức không đọc nổi thì vẫn phải nạp được sổ.
    await Promise.race([huaNgu, new Promise((r) => setTimeout(r, 5000))]);
    try { await napSoTay(); }
    finally { daNapXong = true; moNapDau(); }
  })();
}

/**
 * Sổ có cần vá dữ liệu cũ không — CHỈ ĐỌC, không sửa gì.
 *
 * `load()` chạy sau MỖI thao tác (xoá, đóng băng, thích, chuyển sổ…). Trước đây
 * lần nào nó cũng mở một lượt đọc–sửa–ghi riêng chỉ để QUÉT sổ tìm mục cũ; sổ vài
 * nghìn mục thì cái quét ấy cộng với một lượt đọc thứ hai đã ăn mấy trăm mili-giây
 * mà gần như chẳng bao giờ có gì để vá. Giờ quét thẳng trên bản vừa đọc (vài
 * mili-giây) và chỉ vào hàng đợi ghi khi THẬT SỰ có mục cần vá.
 */
function canVaSoCu(nb) {
  for (const k in nb) {
    const e = nb[k];
    if (!e) continue;
    if (Array.isArray(e.means) && e.means.some((m) => typeof m !== "string")) return true;
    if (e.srs && typeof e.srs.lv === "number" && typeof e.srs.ts !== "number") return true;
  }
  return false;
}

async function napSoTay() {
  let s = await getStore();
  let daSuaCu = false;
  if (canVaSoCu(s.nb)) {
    // Khôi phục các mục cũ bị lưu nghĩa dạng object ("[object Object]") -> chuỗi.
    // Đi qua hàng đợi vì đây cũng là một lượt ghi, và load() hay chạy ngay sau
    // một lượt chấm bài.
    await capNhatNeuDoi((nb) => {
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
      return daSuaCu;
    });
    if (daSuaCu) { syncSoon(); s = await getStore(); }
  }
  // Thu lại URL của lượt vẽ trước rồi bỏ những blob không mục nào còn trỏ tới.
  // Xoá một mục có ảnh mà không quét thì byte nằm lại trong IndexedDB mãi mãi.
  if (window.Anh) {
    window.Anh.nhaUrl();
    window.Anh.quet(s.nb).catch(() => {});
  }
  // Sổ cũ chưa có nhãn ngôn ngữ thì suy từ mục đang dùng nó, rồi ghi lại một
  // lần cho xong — lần sau khỏi phải suy nữa.
  let gan = window.Ngu.ganNguChoSo(s.decks, s.nb);
  if (gan.doi) {
    gan = await suaSoTay(async () => {
      const fresh = await getStore();
      const ra = window.Ngu.ganNguChoSo(fresh.decks, fresh.nb);
      if (ra.doi) await chrome.storage.local.set({ decks: ra.decks });
      return ra;
    });
    if (gan.doi) syncSoon();
  }
  decks = window.Ngu.locSoCon(gan.decks, s.nb, NGU);
  // Chỉ lấy phần của ngôn ngữ đang bật. Hai thứ tiếng nằm chung một kho nhưng
  // khoá đã mang tiền tố sẵn ("javi:", "kanji:", "envi:"), nên lọc là đủ — dữ
  // liệu bên kia vẫn nằm nguyên đó, không hề bị đụng tới.
  items = Object.entries(window.Ngu.locSo(s.nb, NGU)).map(([key, v]) => ({ key, ...v }));
  items.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  // Sổ đang chọn đã bị xoá -> quay về Tất cả.
  if (current !== ALL && current !== NONE && current !== LIKE && current !== DISLIKE && current !== HANTU && !deckName(current)) current = ALL;
  drawDecks();
  draw(true);
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
  /*
   * Từ đóng băng VẪN NẰM TRONG "Tất cả" — ngăn này là một lối xem, không
   * phải một chỗ cất. Ẩn chúng đi thì có từ "biến mất" khỏi sổ và khỏi ô
   * tìm kiếm, rồi vài tháng sau người ta tưởng mình đã xoá nhầm.
   */
  if (id === DONGBANG) return a.filter((it) => !!it.dongBang);
  return a.filter((it) => it.deck === id);
}

function countIn(id) { return setIn(id).length; }

/** Tên đọc được của một ngăn dựng sẵn (sổ con thì hỏi deckName). */
function nhanNgan(id) {
  if (id === NONE) return T("Chưa phân loại");
  if (id === LIKE) return T("Thích");
  if (id === DISLIKE) return T("Không thích");
  if (id === HANTU) return T("Hán tự");
  if (id === DONGBANG) return T("Đóng băng");
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
  /*
   * Ngăn Đóng băng KHÔNG bao giờ mọc nút Học, mà không phải vì có dòng nào
   * đi chặn: `dueIn` gọi `dueList` → `Srs.denHan`, mà `denHan` đã trả rỗng cho
   * mọi từ đóng băng. Một chỗ chặn, không có trường hợp riêng nào đi kèm.
   *
   * Chỉ hiện khi đã có từ nào đóng băng: ai chưa dùng tính năng này thì không
   * phải mang thêm một ngăn rỗng vĩnh viễn trên hàng.
   */
  if (countIn(DONGBANG)) mk(DONGBANG, T("Đóng băng"), "snowflake");
  activeDecks().forEach((d) => mk(d.id, d.name, "folder-simple"));

  const add = el("button", "chip add");
  add.type = "button";
  add.appendChild(ic("folder-plus", { size: 16 }));
  add.appendChild(el("span", "grow", T("Sổ mới")));
  add.addEventListener("click", createDeck);
  bar.appendChild(add);

  // Hai nhãn cố định (Thích / Không thích) không cho đổi tên hay xoá.
  const real = current !== ALL && current !== NONE && current !== LIKE
    && current !== DISLIKE && current !== HANTU && current !== DONGBANG;
  $("deckActions").style.display = real ? "" : "none";
}

async function createDeck() {
  const name = (prompt(T("Tên sổ con mới (ví dụ: Bài 5 - Kanji):")) || "").trim();
  if (!name) return;
  const id = "d_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await capNhat((nb, d) => {
    d[id] = { id, name, ngu: NGU, ts: Date.now() };
  });
  current = id;
  await load();
  syncSoon();
}

async function renameDeck() {
  if (current === ALL || current === NONE) return;
  const cur = deckName(current) || "";
  const name = (prompt(T("Đổi tên sổ:"), cur) || "").trim();
  if (!name || name === cur) return;
  const id = current;
  await capNhat((nb, d) => {
    if (d[id] && !d[id].del) d[id] = Object.assign({}, d[id], { name, ts: Date.now() });
  });
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

/**
 * Sửa xong MỘT mục thì chỉ dựng lại đúng hàng đó + các con số trên đầu trang.
 *
 * Trước đây mọi nút trên hàng (thích, đóng băng, tắt mạng nghĩa, chuyển sổ) đều
 * kết thúc bằng `load()`: đọc lại cả sổ rồi vẽ lại cả danh sách. Hàng không còn
 * thuộc danh sách đang xem (đổi "thích" khi đang ở tab Thích…) thì biến mất.
 * @param {object} it mục (chính phần tử của `items`, đã được sửa tại chỗ)
 */
function taiCho(it) {
  const r = document.querySelector('#list .entry[data-key="' + CSS.escape(it.key) + '"]');
  const rows = veDau();
  drawDecks();
  rowsHienTai = rows;
  if (r) {
    if (rows.some((x) => x.key === it.key)) r.replaceWith(veHang(it, activeDecks(), Date.now()));
    else { chon.delete(it.key); r.remove(); }
  }
  if (!rows.length) veLoHang(true);
  veThanhChon();
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
  const it = items.find((x) => x.key === key);
  if (it) { if (deckId === NONE) delete it.deck; else it.deck = deckId; taiCho(it); }
  else await load();
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
  /*
   * Cập nhật TẠI CHỖ đúng hàng vừa sửa, không `load()`: nạp lại cả sổ rồi vẽ lại
   * danh sách làm hàng đang xem nhảy về đầu trang và chiếm cả giây trên sổ lớn.
   */
  const s1 = await getStore();
  const moi = s1.nb[key];
  const idx = items.findIndex((x) => x.key === key);
  if (moi && idx >= 0) {
    items[idx] = { key, ...moi };
    taiCho(items[idx]);
  } else await load();
  // Sửa ngay giữa buổi học thì thẻ đang mở phải đổi theo luôn: `session.queue`
  // giữ một bản chụp của mục, `load()` không đụng tới nó, nên không cập nhật ở
  // đây thì thẻ vẫn nằm đó với nghĩa cũ — đúng cái nghĩa vừa sửa vì nó sai.
  const dangHoc = theCardHienTai();
  if (dangHoc && dangHoc.key === key) {
    if (s1.nb[key]) { Object.assign(dangHoc, s1.nb[key]); showCard(true); }
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
      if (sauDo) sauDo(); else taiCho(it);
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
 * Bật/tắt một cờ trên một mục (`dongBang`).
 *
 * Cả hai đều chỉ là một số 1 ghi vào mục; toàn bộ hệ quả nằm trong `srs.js`
 * (`Srs.denHan` và `Srs.duongCo` đọc chúng). Nên ở đây không có luật nào hết,
 * và đó là chủ ý: luật nằm một chỗ thì bản Android và máy chủ MCP không
 * lệch được.
 */

async function datLichRieng(key, duong, lenh, ngay) {
  const moi = await capNhat((nb) => {
    const it = nb[key]; if (!it || it.del) return null;
    const ne = window.Srs.datLich(it, duong, lenh, ngay, Date.now());
    ne.srs = window.Srs.gomSrs(ne) || ne.srs;
    nb[key] = ne; return Object.assign({ key: key }, ne);
  });
  syncSoon();
  await locHangDoiLich();
  return moi;
}
async function locHangDoiLich() {
  const nb = (await getStore()).nb;
  if (session && session.queue && session.queue.length) {
    const cu = session.queue[0];
    session.queue = session.queue.filter((q) => nb[q.key] && !window.Srs.biChan(nb[q.key], q._d || "nhin", Date.now()));
    if (session.queue[0] !== cu) showCard();
  }
}


chrome.storage.onChanged.addListener((doi, area) => {
  if (area !== "local" || !doi.notebook || !session.queue.length) return;
  const cu = doi.notebook.oldValue || {}, moi = doi.notebook.newValue || {};
  const chot = (x) => JSON.stringify(x && [x.del, x.dongBang, x.lichRieng]);
  if (session.queue.some(q => chot(cu[q.key]) !== chot(moi[q.key])))
    locHangDoiLich().catch(() => toast(T("Không cập nhật được hàng đợi. Hãy mở lại buổi học."), "bad"));
});

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
 * ĐẶT Ở ĐÂY, không nhét vào khối nào khác: một khối trống thì cờ vẫn bật mà không
 * danh sách đều rỗng, nên nhét vào đó thì có trường hợp cờ đang bật mà không
 * còn nút nào để tắt — một cái công tắc không gỡ lại được thì tệ hơn là không
 * có công tắc.
 *
 * Trạng thái đọc được KHÔNG CẦN MÀU, như favButtons: bông tuyết đặc là đang
 * đóng băng, và mạng nghĩa tắt thì icon đeo một gạch chéo (lớp `tat` trong CSS).
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
  b1.innerHTML = window.Icon("snowflake", { size: 17, weight: bang ? "solid" : "line" });
  b1.addEventListener("click", async (e) => {
    e.stopPropagation();
    it.dongBang = (await datCo(it.key, "dongBang", !bang)) ? 1 : 0;
    if (!it.dongBang) delete it.dongBang;
    if (sauDo) sauDo(); else taiCho(it);
  });
  wrap.appendChild(b1);

  wrap.appendChild(window.LichRiengUI.nut(it, datLichRieng, async (moi) => {
    // Lịch riêng đổi → dựng lại ĐÚNG hàng này (và các con số), không nạp lại cả sổ.
    const i = items.findIndex((x) => x.key === it.key);
    if (moi && i >= 0) { items[i] = { key: it.key, ...moi }; taiCho(items[i]); } else await load();
  }));
  return wrap;
}

/* ==================================================================== */
/* Mở lại trang nguồn, tô sáng đúng đoạn đã lưu                          */
/* ==================================================================== */

// Hai lớp bổ trợ nhau:
//  1) Text Fragment (#:~:text=): trình duyệt tự cuộn + tô sáng. Chạy được cả
//     trên trang web thường. PDF ưu tiên tab nguồn và mốc URL đã lưu.
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

function openYoutube(yt, chiaDoi) {
  const t = Math.max(0, Math.floor(yt.t || 0));
  const url = "https://www.youtube.com/watch?v=" + encodeURIComponent(yt.v) + "&t=" + t + "s";
  const mo = () => { if (chiaDoi && CAI.chiaDoi !== false) moCuaSoRieng(url); else chrome.tabs.create({ url }); };
  try {
    chrome.tabs.query({ url: ["https://www.youtube.com/watch*", "https://m.youtube.com/watch*"] }, (tabs) => {
      const hit = (tabs || []).find((tb) => (tb.url || "").indexOf("v=" + yt.v) >= 0);
      if (!hit) { mo(); return; }
      chrome.tabs.update(hit.id, { active: true });
      if (hit.windowId != null) chrome.windows.update(hit.windowId, { focused: true });
      chrome.tabs.sendMessage(hit.id, { type: "YT_SEEK", v: yt.v, t: t }, () => {
        // Thẻ mở từ trước khi cài/nạp lại extension thì chưa có content script;
        // lúc đó tải thẳng URL kèm mốc giây là xong.
        if (chrome.runtime.lastError) chrome.tabs.update(hit.id, { url: url });
      });
    });
  } catch (e) { mo(); }
}

/**
 * @param {boolean} [chiaDoi] mở ở cửa sổ riêng. Chỉ bật từ chế độ học — bấm
 *   link trong danh sách sổ tay mà bật thêm cửa sổ thì phiền.
 */
async function openSource(it, chiaDoi) {
  const src = it.src;
  if (!src || !src.url) return;
  // Dừng ĐỒNG HỒ Ở ĐÂY, không ở từng nút: mọi đường mở nguồn — nút trên thẻ,
  // phím cách, hay chỗ nào thêm sau này — đều đi qua đây. Đặt ở nút thì sớm muộn
  // có một lối quên, và quên thì không có gì báo. Ngoài buổi học thì nó vô hại:
  // `mocHienThe` và `baiDien` đều rỗng nên `dungDongHo` không làm gì.
  dungDongHo();
  if (src.yt && src.yt.v) { openYoutube(src.yt, chiaDoi); return; }
  const text = (src.sel || it.word || "").replace(/\s+/g, " ").trim();
  const url = fragUrl(src);
  if (src.pdf) {
    if (await window.PdfSource.activate(src)) return;
    const pdfUrl = window.PdfSource.reopenUrl(src, url);
    if (chiaDoi && CAI.chiaDoi !== false) moCuaSoRieng(pdfUrl); else chrome.tabs.create({ url: pdfUrl });
    return;
  }
  chrome.storage.local.set({
    pendingHighlight: { url: src.url, text: text, prefix: src.prefix || "", suffix: src.suffix || "", ts: Date.now() }
  }, () => {
    if (chiaDoi && CAI.chiaDoi !== false) moCuaSoRieng(url); else chrome.tabs.create({ url });
  });
}

/* ==================================================================== */
/* Hỏi Gemini                                                           */
/* ==================================================================== */

/**
 * Những thứ `hoi-gemini.js` không tự tính được, phải lấy từ màn này.
 *
 * Tách ra một hàm riêng vì cả sổ tay lẫn buổi học đều gọi — mà nếu chép tay
 * hai bản thì sớm muộn một bên quên mất một trường, và triệu chứng của nó là
 * "hỏi từ trong sổ thì đủ, hỏi lúc đang học thì thiếu" — rất khó nhận ra.
 */
function phuGemini(it) {
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
  } catch (e) { /* chưa có tiến độ thì thôi, không phải thứ đáng chặn */ }
  const so = deckName(it.deck);
  if (so) p.so = so;
  return p;
}

/**
 * Chép một đoạn dài vào bộ nhớ tạm.
 *
 * Hai ngả, vì ngả mới không phải lúc nào cũng có: `navigator.clipboard` đòi
 * trang đang được nhìn, và im lặng từ chối khi không. `execCommand("copy")` thì
 * cũ kỹ, đã bị khai tử trên giấy tờ, nhưng vẫn chạy ở đúng những chỗ ấy.
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

/** "⌘V" hay "Ctrl+V" — nói sai phím thì lời mách còn hại hơn không có. */
function phimDan() {
  const m = (navigator.userAgentData && navigator.userAgentData.platform)
    || navigator.platform || navigator.userAgent || "";
  return /Mac|iPhone|iPad|iPod/i.test(m) ? "\u2318V" : "Ctrl+V";
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
 * Chép TRƯỚC khi mở tab: tab mới giành mất tiêu điểm, mà trình duyệt từ chối
 * ghi bộ nhớ tạm từ một trang không còn được nhìn.
 *
 * Chép hỏng thì KHÔNG mở Gemini. Mở ra một ô trống mà chẳng có gì để dán chỉ
 * làm người ta tưởng đã xong rồi loay hoay ở đầu bên kia.
 */
async function moGemini(it) {
  if (!it || !it.word) return;
  dungDongHo();                 // sang Gemini đọc thì cũng thôi là truy xuất
  const loi = window.HoiGemini.loiHoi(it, phuGemini(it));
  if (!(await chepChu(loi))) {
    toast(T("Không chép được câu hỏi vào bộ nhớ tạm — bấm lại một lần nữa."), "bad");
    return;
  }
  /*
   * Nhờ NỀN mở tab chứ không tự `chrome.tabs.create` ở đây.
   *
   * Vì nền còn phải canh chính cái tab ấy: hỏi xong, Gemini đổi địa chỉ thành
   * `/app/<mã đoạn chat>`, và đó là thứ đáng giữ lại cho mục này. Mở từ trang
   * sổ tay thì trang này đóng lại là hết ai canh.
   */
  chrome.runtime.sendMessage({ type: "MO_GEMINI", key: it.key }, () => {
    if (chrome.runtime.lastError) {                 // nền không trả lời — vẫn phải mở được
      try { window.open(window.HoiGemini.GOC_URL, "_blank"); } catch (e) {}
    }
  });
  toast(T2("Đã chép câu hỏi — sang Gemini bấm {phim} rồi Enter.", { phim: phimDan() }));
}

/**
 * Dán tay đường link đoạn chat — đường lui cho lúc nền không bắt được.
 *
 * Cách bắt tự động dựa vào việc Gemini đổi địa chỉ bằng `pushState`. Đó là
 * cách nó đang làm, nhưng là trang của người khác: họ đổi lúc nào cũng được,
 * và lúc ấy tính năng chết câm mà không có gì báo. Nên chừa một đường tay, đi
 * đúng lối chuột-phải mà nút nguồn ở thẻ sổ tay vẫn dùng.
 */
async function danLinkGemini(it) {
  let t = "";
  try { t = (await navigator.clipboard.readText() || "").trim(); }
  catch (e) { toast(T("Không đọc được bộ nhớ tạm"), "bad"); return; }
  if (!/^https:\/\/gemini\.google\.com\/app\/[\w-]+/.test(t)) {
    // Kiểm rồi mới ghi: dán nhầm thì nút "Mở" dẫn đi đâu không biết, mà lúc
    // bấm mới phát hiện thì đoạn chat thật có khi đã trôi khỏi lịch sử.
    toast(T("Bộ nhớ tạm không phải link đoạn chat Gemini"), "bad");
    return;
  }
  await capNhat((nb) => {
    const e = nb[it.key];
    if (!e || e.del) return;
    nb[it.key] = Object.assign({}, e, { hoiAi: { url: t, ts: Date.now() } });
  });
  await load();
  syncSoon();
  toast(T("Đã lưu link đoạn chat vào ghi chú"));
}

/** Nút "hỏi Gemini" trong thẻ sổ tay. Thẻ học dùng nút riêng ở HTML (#stGemini). */
function nutGemini(it) {
  const b = nutIcon("sparkle", T("Hỏi Gemini về từ này kèm ngữ cảnh đã lưu"), "gemini", 17);
  b.addEventListener("click", (ev) => { ev.stopPropagation(); moGemini(it); });
  // Chuột phải = dán tay link đoạn chat, cùng lối với nút nguồn ngay bên cạnh.
  b.addEventListener("contextmenu", (ev) => { ev.preventDefault(); danLinkGemini(it); });
  return b;
}

/* ==================================================================== */
/* Danh sách                                                            */
/* ==================================================================== */

function currentActiveSet() { return setIn(current); }

/** Khối ghi chú riêng, hiện dưới phần nghĩa. */
/** Mở một đường link ngoài. Tab mới, không giành mất trang sổ tay. */
function MO_LINK(url) {
  try { chrome.tabs.create({ url: url }); }
  catch (e) { window.open(url, "_blank"); }
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

/**
 * Bật/tắt một cờ cho CẢ DANH SÁCH ĐANG HIỆN, một lượt ghi, một lần Hoàn tác.
 *
 * Một lượt `capNhat` chứ không phải N lượt: rà cả sổ là hàng trăm mục, mỗi mục
 * một lượt ghi + một lượt đồng bộ thì vừa chậm vừa có lúc chết giữa chừng, để lại
 * một nửa sổ ở trạng thái này, một nửa ở trạng thái kia.
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
  await load();
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
      await load();
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

  if (daBang.length) {
    nut(T2("Gỡ băng tất cả ({n})", { n: daBang.length }), () =>
      lamHangLoat(daBang, "dongBang", false,
        "Đã gỡ băng {n} từ — chúng tới hạn ngay từ buổi học tới",
        "Đã đóng băng lại {n} từ"));
  }
  o.style.display = o.children.length ? "" : "none";
}

/**
 * Số đếm trên đầu trang (đang hiện bao nhiêu, bao nhiêu đến hạn) + khối thao tác
 * hàng loạt. Tách khỏi `draw()` để xoá/sửa TẠI CHỖ cập nhật được các con số này
 * mà không phải vẽ lại cả danh sách.
 * @returns {object[]} các mục đang hiện (sau cả ngăn lẫn ô lọc)
 */
function veDau() {
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

  veHangLoat(rows);
  return rows;
}

/*
 * VẼ THEO LÔ.
 *
 * Đây là thủ phạm của cảnh "bấm xoá một từ mà đợi cả giây": `draw()` dựng DOM
 * cho TẤT CẢ các mục — mỗi mục hàng chục phần tử, cả chục nút kèm icon SVG, một
 * ô chọn sổ… — mà gần như mọi thao tác (xoá, đóng băng, thích, chuyển sổ) lại gọi
 * `load()` rồi vẽ lại từ đầu. Đo trên sổ 1.500 từ: vẽ cả sổ mất ~2 giây, xoá một
 * từ mất 2–3 giây, và trong suốt thời gian ấy luồng chính đứng im nên các nút
 * khác cũng không ăn.
 *
 * Giờ chỉ dựng một trang (TRANG_HANG mục) rồi dựng tiếp khi cuộn tới gần cuối.
 * Người ta chỉ nhìn thấy vài mục một lúc, nên chi phí mỗi lần vẽ không còn phụ
 * thuộc vào kích thước sổ.
 */
const TRANG_HANG = 40;
let rowsHienTai = [];
let quanSatCuoi = null;

/** Vùng đang cuộn của trang: `.main` ở màn rộng, cả trang ở màn hẹp. */
function vungCuon() {
  const m = document.querySelector(".main");
  if (m && m.scrollHeight > m.clientHeight + 1 && getComputedStyle(m).overflowY !== "visible") return m;
  return document.scrollingElement || document.documentElement;
}

/**
 * @param {boolean} [giu] true = vẽ lại sau một thao tác (sửa nghĩa, nạp lại…):
 *   dựng lại ĐỦ số hàng đã hiện và trả thanh cuộn về đúng chỗ cũ. Không có nó thì
 *   danh sách bị dựng lại từ đầu và nhảy về hàng đầu tiên — đúng cái cảnh "sửa
 *   nghĩa một từ ở giữa sổ xong thì bị ném lên đầu trang". Đổi ngăn / gõ lọc thì
 *   KHÔNG giữ: danh sách đã khác, nhảy về đầu mới đúng.
 *   (Chỉ nhận đúng `true` — draw còn được gắn thẳng làm hàm xử lý sự kiện nhập.)
 */
function draw(giu) {
  const vung = vungCuon();
  const giuViTri = giu === true;
  const top = giuViTri ? vung.scrollTop : 0;
  const daVe = giuViTri ? document.querySelectorAll("#list .entry").length : 0;
  const rows = veDau();
  // Chỉ giữ lại những mục đang được chọn mà vẫn còn hiện: đổi ngăn / gõ lọc thì
  // đừng để một lượt "Xoá" lỡ tay quét cả những từ người ta đã không còn nhìn thấy.
  if (chon.size) {
    const con = new Set(rows.map((it) => it.key));
    for (const k of Array.from(chon)) if (!con.has(k)) chon.delete(k);
  }
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

  rowsHienTai = rows;
  veLoHang(true);
  if (giuViTri) {
    // Dựng bù cho tới khi có lại ít nhất số hàng đang hiện trước đó, rồi trả cuộn.
    while (rowsHienTai.length && document.querySelectorAll("#list .entry").length < Math.min(daVe, 400, rowsHienTai.length)) veLoHang(false);
    vung.scrollTop = top;
  }
  veThanhChon();
}

/** Dựng thêm một trang hàng vào cuối danh sách (hoặc dựng lại từ đầu nếu `lai`). */
function veLoHang(lai) {
  const listEl = $("list");
  if (quanSatCuoi) { quanSatCuoi.disconnect(); quanSatCuoi = null; }
  if (lai) listEl.textContent = "";
  else { const cu = $("listMore"); if (cu) cu.remove(); }

  if (!rowsHienTai.length) {
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
  const da = listEl.querySelectorAll(".entry").length;
  const frag = document.createDocumentFragment();
  for (const it of rowsHienTai.slice(da, da + TRANG_HANG)) frag.appendChild(veHang(it, dks, now));
  listEl.appendChild(frag);

  if (da + TRANG_HANG < rowsHienTai.length) {
    const con = rowsHienTai.length - da - TRANG_HANG;
    const more = el("button", "list-more", T2("Hiện thêm {n} mục", { n: con }));
    more.id = "listMore";
    more.type = "button";
    more.addEventListener("click", () => veLoHang(false));
    listEl.appendChild(more);
    // Cuộn tới gần cuối thì tự dựng tiếp; nút bên trên chỉ là đường lùi.
    if ("IntersectionObserver" in window) {
      quanSatCuoi = new IntersectionObserver((ds) => {
        if (ds.some((d) => d.isIntersecting)) veLoHang(false);
      }, { rootMargin: "900px 0px" });
      quanSatCuoi.observe(more);
    }
  }
}

/** Dựng DOM cho MỘT mục sổ tay. */
function veHang(it, dks, now) {
  const row = el("div", "entry" + (it.kind === "sent" ? " sent" : "") + (it.dict === "kanji" ? " kanji" : "")
    + (chon.has(it.key) ? " chon" : ""));
  row.dataset.key = it.key;
  // Ô chọn thay cho nút xoá từng mục: tích một hoặc nhiều từ rồi xoá một lượt.
  const oChon = el("label", "chon-o");
  oChon.title = T("Chọn từ này");
  const hop = document.createElement("input");
  hop.type = "checkbox";
  hop.checked = chon.has(it.key);
  hop.setAttribute("aria-label", T("Chọn từ này"));
  hop.addEventListener("change", () => {
    if (hop.checked) chon.add(it.key); else chon.delete(it.key);
    row.classList.toggle("chon", hop.checked);
    veThanhChon();
  });
  oChon.appendChild(hop);
  row.appendChild(oChon);
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
  head.appendChild(nutRutOn(it));
  head.appendChild(el("span", "tag", dirLabel(it.dict)));
  if (it.mEdit) {
    const t = el("span", "tag edited");
    t.appendChild(ic("pencil-simple", { size: 12 }));
    t.appendChild(el("span", null, T("đã sửa")));
    head.appendChild(t);
  }
  // Điểm và hạn ôn đi cùng một chỗ: biết "đến hạn" mà không biết mình đang ở
  // đâu thì không thấy được là đã tiến tới đâu — mà đó mới là thứ giữ người
  // ta ôn tiếp. Chip giờ BẤM ĐƯỢC: mở bảng bốn đường và ôn ngay bài còn lại.
  head.appendChild(chipDiem(it, now));
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
  // Ngữ cảnh + bản dịch NGAY SAU nghĩa.
  const ngc = khoiNguCanh(it, false);
  if (ngc) body.appendChild(ngc);
  if (coGhiChu(it)) body.appendChild(khoiGhiChu((it.note || "").trim(), it.hoiAi));
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

  // Hỏi Gemini đứng ĐẦU hàng: mấy nút còn lại đều là sửa cái đã có, nút này
  // là đi hỏi thêm — việc khác loại, và là việc hay cần nhất lúc gặp lại một
  // từ mà không nhớ nó nằm trong câu nào.
  hang.appendChild(nutGemini(it));

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
  return row;
}

/* ==================================================================== */
/* Chọn nhiều + xoá hàng loạt                                           */
/* ==================================================================== */
/*
 * Thay cho nút thùng rác trên từng hàng. Nút ấy vừa dễ bấm nhầm (nằm sát mấy nút
 * sửa), vừa buộc người dùng xoá từng từ một — dọn sổ mấy chục từ là mấy chục lần
 * bấm. Giờ: tích ô ở đầu hàng (một hoặc nhiều từ), thanh hành động hiện ra, bấm
 * "Xoá" là xoá luôn (không hỏi lại), cả loạt trong MỘT lượt ghi, kèm "Hoàn tác". Chế độ HỌC có nút xoá riêng ("Đã thuộc hẳn") và giữ
 * nguyên.
 */
const chon = new Set();

function veThanhChon() {
  const o = $("thanhChon");
  if (!o) return;
  const n = chon.size;
  // Chỉ hiện ở màn Sổ tay: sang Tiến độ / Luyện nói thì thanh này vô nghĩa.
  o.style.display = (n && $("viewList").classList.contains("show")) ? "" : "none";
  if (!n) return;
  $("chonSo").textContent = T2("Đã chọn {n}", { n });
  const tatCa = rowsHienTai.length && rowsHienTai.every((it) => chon.has(it.key));
  $("chonTatCa").textContent = tatCa ? T("Bỏ chọn tất cả") : T2("Chọn tất cả ({n})", { n: rowsHienTai.length });
}

/** Tích/bỏ tích mọi hàng đang hiện — kể cả những hàng chưa dựng vì ở xa phía dưới. */
function chonTatCa(bat) {
  if (bat) rowsHienTai.forEach((it) => chon.add(it.key)); else chon.clear();
  document.querySelectorAll("#list .entry").forEach((r) => {
    const co = chon.has(r.dataset.key);
    r.classList.toggle("chon", co);
    const h = r.querySelector(".chon-o input");
    if (h) h.checked = co;
  });
  veThanhChon();
}

/**
 * Xoá một loạt mục — TẠI CHỖ rồi mới ghi.
 *
 * Màn hình đổi NGAY (hàng biến mất, con số cập nhật) và việc ghi cả sổ xuống đĩa
 * chạy sau lưng. Trước đây phải ghi xong, nạp lại cả sổ rồi vẽ lại toàn bộ danh
 * sách mới thấy hàng biến mất. Ghi hỏng thì nạp lại để màn hình nói đúng sự thật.
 */
async function xoaCacMuc(keys) {
  const bo = new Set(keys);
  if (!bo.size) return;
  const tenDau = (items.find((it) => bo.has(it.key)) || {}).word || "";

  // 1) Màn hình
  for (const it of items) if (bo.has(it.key)) it.del = true;
  bo.forEach((k) => chon.delete(k));
  const listEl = $("list");
  listEl.querySelectorAll(".entry").forEach((r) => { if (bo.has(r.dataset.key)) r.remove(); });
  rowsHienTai = veDau();
  drawDecks();
  if (!rowsHienTai.length) veLoHang(true);
  else if (listEl.querySelectorAll(".entry").length < Math.min(TRANG_HANG, rowsHienTai.length)) veLoHang(false);
  veThanhChon();

  // 2) Ổ đĩa
  const cu = {};
  try {
    await capNhat((nb) => {
      bo.forEach((k) => {
        if (nb[k] && !nb[k].del) { cu[k] = nb[k]; nb[k] = window.Muc.biaMo(nb[k]); }
      });
    });
  } catch (e) {
    toast(T("Không xoá được — đã nạp lại sổ tay."), "bad");
    await load();
    return;
  }
  syncSoon();
  getStore().then((s) => { if (window.Anh) window.Anh.quet(s.nb).catch(() => {}); }).catch(() => {});
  const n = Object.keys(cu).length;
  toast(n === 1 ? T2("Đã xoá “{tu}”", { tu: tenDau.slice(0, 24) }) : T2("Đã xoá {n} từ", { n }),
    null, n ? { chu: T("Hoàn tác"), lam: () => hoanTacXoa(cu) } : null);
}

/** Đặt lại các mục vừa xoá, nguyên vẹn như trước khi xoá (kể cả tiến độ ôn). */
async function hoanTacXoa(cu) {
  await capNhat((nb) => {
    for (const k in cu) nb[k] = Object.assign({}, cu[k], { ts: Date.now() });
  });
  await load();
  syncSoon();
  toast(T("Đã khôi phục"));
}

$("chonTatCa").addEventListener("click", () =>
  chonTatCa(!(rowsHienTai.length && rowsHienTai.every((it) => chon.has(it.key)))));
$("chonBo").addEventListener("click", () => chonTatCa(false));
// Bấm Xoá là XOÁ NGAY, không hỏi lại: người dùng đã chủ động tích chọn rồi mới bấm.
// Lỡ tay thì có "Hoàn tác" trên thông báo (6,5 giây), khôi phục nguyên vẹn.
$("chonXoa").addEventListener("click", () => xoaCacMuc(Array.from(chon)));
document.addEventListener("keydown", (e) => {
  // Delete xoá các mục đang chọn (khi không đang gõ chữ và không có hộp nào mở).
  const dangGo = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "");
  if (e.key === "Delete" && chon.size && !dangGo && !document.querySelector(".sheet.show, dialog[open]")) xoaCacMuc(Array.from(chon));
});

/* ==================================================================== */
/* Buổi học                                                             */
/* ==================================================================== */

let session = { queue: [], done: 0, again: 0, deleted: 0 };
let lastDeleted = null;
const ovl = $("studyOverlay");

/**
 * Thẻ ĐANG HIỆN TRÊN MÀN HÌNH — không phải đầu hàng đợi.
 *
 * Hai thứ đó lệch nhau ở đúng một khoảng, và khoảng ấy là lúc dễ bấm nhầm nhất:
 * từ lúc bấm Nhớ (grade() đã `shift()` thẻ ra khỏi hàng) cho tới lúc showCard()
 * vẽ thẻ kế. Trong khoảng đó cửa sổ "nghe lại nguồn?" đang mở, mặt thẻ vẫn là
 * từ vừa chấm, mà mọi nút trên mặt thẻ — Sửa bản dịch, Ghi chú, loa, Xoá, tim —
 * lại đọc đầu hàng đợi, tức là từ KẾ TIẾP.
 *
 * Đó chính là "bấm Sửa bản dịch rồi Lưu thì nó trôi sang từ khác": bản dịch mới
 * ghi vào một mục người dùng chưa hề nhìn thấy.
 */
let theTrenMan = null;
function theCardHienTai() { return theTrenMan || session.queue[0]; }

/**
 * Dòng tiến trình trên mặt thẻ học.
 *
 * Tách ra thành hàm riêng vì có hai chỗ cần vẽ nó: lúc đổi thẻ, và lúc bấm
 * "Tắt mạng nghĩa" ngay trên thẻ — tắt là trọng số chia lại nên ĐIỂM ĐỔI NGAY,
 * mà con số cũ nằm nguyên đó thì trông như nút không ăn.
 */
function veTienTrinh(it) {
  /*
   * Nói luôn ĐANG KIỂM ĐƯỜNG NÀO và từ này đang được mấy điểm.
   *
   * Từ khi mỗi đường một lịch riêng, cùng một từ có thể hiện ra dưới bốn kiểu
   * đề khác nhau. Không nói ra thì người học gặp đề nghe của một từ mình vừa
   * làm đề nhìn hôm qua và tưởng app hỏi lặp. Còn con số điểm thì đây là chỗ nó
   * cần có mặt nhất: ngay lúc người ta đang bỏ công ra làm cho nó lên.
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

  /*
   * Hai công tắc rút bớt việc cũng nằm ở đây, vì ĐÂY MỚI LÀ LÚC NGHĨ RA.
   *
   * "Mấy từ đồng nghĩa này chẳng dính gì tới từ gốc" và "từ này mình thuộc hẳn
   * rồi" đều là ý nảy ra giữa buổi học, khi đang nhìn chính cái thẻ ấy. Bắt người
   * ta nhớ để lát nữa vào sổ tay tìm lại thì chẳng ai làm.
   *
   * Dùng nút CÓ CHỮ chứ không icon trần như bên sổ tay: đây là hai thao tác
   * đổi lịch ôn của một từ, bấm nhầm giữa buổi học thì khó nhận ra hơn hẳn
   * bấm nhầm một cái tim.
   */
  const co = (ten, iconTen, bat, chu, chuBat) => {
    const b = el("button", "btn sm" + (bat ? " tinted" : ""));
    b.type = "button";
    b.innerHTML = window.Icon(iconTen, { size: 17, weight: bat ? "solid" : "line" });
    b.appendChild(el("span", "lb", bat ? chuBat : chu));
    b.addEventListener("click", async () => {
      const moi = await datCo(it.key, ten, !bat);
      if (moi) it[ten] = 1; else delete it[ten];
      renderStudyFav(it);
      // Vẽ lại chip điểm trên mặt thẻ: tắt mạng nghĩa là điểm ĐỔI NGAY (trọng
      // số chia lại), mà con số cũ nằm nguyên đó thì trông như nút không ăn.
      veTienTrinh(it);
      await locHangDoiLich();
    });
    return b;
  };
  box.appendChild(co("dongBang", "snowflake", !!it.dongBang,
    T("Đóng băng"), T("Đang đóng băng")));
  box.appendChild(window.LichRiengUI.nut(it, datLichRieng));
}

async function startStudy() {
  /*
   * Chờ sổ về TRƯỚC khi hỏi có gì tới hạn không. Xem chú thích ở chỗ khai báo
   * huaNap: không chờ thì câu trả lời là "không có gì" dù sổ đầy từ tới hạn.
   *
   * Nút bị khoá trong lúc chờ, để bấm dồn không mở ra hai buổi học chồng nhau.
   */
  const nut = $("study");
  if (!daNapXong) {
    /*
     * Và phải NÓI RA là đang chờ. Trên sổ hai nghìn từ, lượt chờ này dài gần ba
     * giây; một cái nút câm lặng không phản ứng suốt ba giây thì người ta bấm
     * lại mấy lần rồi kết luận là app treo — đổi một lời nói dối lấy một vẻ
     * chết máy thì chẳng hơn gì.
     */
    /*
     * Lời báo "đang chờ" nằm trong MỘT THẺ RIÊNG, không mang `data-chu`.
     *
     * Hai bản vá trước đều hỏng ở đây. Đặt thẳng nut.textContent thì xoá luôn
     * <span id="dueCount"> nằm trong nút, và draw() ngay sau đó ném "Cannot set
     * properties of null". Đổi chữ của #studyLabel thì cũng không xong: nhãn ấy
     * mang `data-chu`, mà lượt dựng trang gọi Chu.dat() NGAY SAU cú bấm — hàm
     * ấy quét mọi [data-chu] và trả chữ về bản gốc, xoá mất lời báo. Đo được:
     * nút đứng câm suốt 3029ms.
     *
     * Thẻ riêng không mang dấu thì bộ dịch không đụng tới, và #dueCount vẫn còn
     * nguyên chỗ của nó.
     */
    const nhan = $("studyLabel"), oCho = $("studyCho");
    if (nut) nut.disabled = true;
    if (oCho) { oCho.textContent = T("Đang mở sổ tay…"); oCho.hidden = false; }
    if (nhan) nhan.hidden = true;
    try { await choNapXong(); }
    finally {
      if (nut) nut.disabled = false;
      if (oCho) oCho.hidden = true;
      if (nhan) nhan.hidden = false;
    }
  }
  // Xếp hàng thẳng từ danh sách đang mở: `hangDoiKhoi` đã tự hỏi từng đường
  // một, lọc qua `dueList` trước đó là lọc HAI LẦN và làm rơi mất những mục mà
  // chỉ một đường tới hạn.
  const khoi = hangDoiKhoi(currentActiveSet());
  if (!khoi.length) {
    toast(T("Không có mục nào đến hạn trong mục này. Quay lại sau nhé!"), "bad");
    return;
  }
  /*
   * Xáo theo KHỐI, trong khối giữ nguyên.
   *
   * Xáo phẳng cả hàng đợi thì 改善 rơi đầu buổi còn 改良 rơi cuối, và cả việc ôn
   * kèm cụm thành công cốc — cái được của nó nằm ở chỗ mấy từ ấy đi LIỀN NHAU.
   */
  const due = [];
  for (const k of khoi.slice().sort(() => Math.random() - 0.5)) for (const x of k) due.push(x);
  session = { queue: due, done: 0, again: 0, deleted: 0 };
  lastDeleted = null;
  $("stUndo").style.display = "none";
  $("stBody").style.display = "";
  $("stDone").style.display = "none";
  ovl.classList.add("show");
  batNhacTau();
  showCard();
}

/**
 * Hàng đợi của "Ôn từng đường": mỗi từ tới hạn ở một trong các đường `ds` thì
 * thành MỘT thẻ (từ có cả đường dong lẫn trai tới hạn cũng chỉ lấy một — luật
 * một-đường-một-lần vẫn đúng ở đây). Chỉ lấy thẻ ĐÃ tới hạn: ôn sớm vẫn được
 * nới ngày y như ôn đúng hạn, nên cho ôn cả thẻ chưa tới hạn là mở lối cày điểm.
 */
function hangDoiDuong(scopeList, ds) {
  const now = Date.now();
  const ra = [];
  for (const it of scopeList) {
    if (it.del) continue;
    const d = ds.find((t) => window.Srs.denHanDuong(it, t, now));
    if (d) ra.push(Object.assign({}, it, { _d: d }));
  }
  return ra;
}

async function startStudyDuong() {
  if (!daNapXong) await choNapXong();
  window.DuongRiengUI.mo(
    (ds) => hangDoiDuong(currentActiveSet(), ds).length,
    (ds) => {
      const hang = hangDoiDuong(currentActiveSet(), ds).sort(() => Math.random() - 0.5);
      if (!hang.length) { toast(T("Chưa có bài nào đến hạn ở loại này."), "bad"); return; }
      session = { queue: hang, done: 0, again: 0, deleted: 0 };
      lastDeleted = null;
      $("stUndo").style.display = "none";
      $("stBody").style.display = "";
      $("stDone").style.display = "none";
      ovl.classList.add("show");
      batNhacTau();
      showCard();
    });
}

/**
 * Buổi ôn của MỘT từ, mở thẳng từ chip điểm.
 *
 * Dùng lại nguyên bộ máy của buổi học thường chứ không dựng cái thứ hai:
 * `showCard` phân nhánh hoàn toàn theo `it._d`, còn `grade` và `chonDien`
 * chỉ đọc `session.queue`. Nên một buổi ôn riêng chỉ là một hàng đợi dựng khác
 * đi — mọi thứ còn lại (bấm giờ truy xuất, cổ vũ, ghi sổ, hoàn tác) chạy y hệt,
 * và sẽ không lệch đi khi bộ máy kia được sửa sau này.
 *
 * `session.rieng` giữ KHOÁ chứ không giữ cả mục: tới lúc tổng kết thì mục trong
 * `items` đã cũ, phải đọc lại từ kho mới ra điểm vừa mới chấm xong.
 *
 * @param {string[]} ds tên các đường sẽ ôn, theo đúng thứ tự
 */
function hocRieng(it, ds) {
  session = { queue: ds.map((d) => Object.assign({}, it, { _d: d })),
              done: 0, again: 0, deleted: 0, rieng: it.key };
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

const HU_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
const HU_V = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.8l5 5L19.5 7"/></svg>';

/**
 * Dấu X đỏ nhạt (quên) hoặc dấu V xanh (nhớ) nổi lên giữa màn rồi tan.
 *
 * Phần tử dùng lại chứ không dựng mới mỗi lượt: bấm F/J dồn dập thì chỉ khởi
 * động lại hoạt ảnh, không đẻ thêm nút DOM. Không `await` gì cả — hiệu ứng phải
 * ra cùng lúc với cú bấm, trước cả lượt ghi sổ.
 */
function hieuUng(nho) {
  const ban = $("stHieuUng");
  if (!ban) return;
  let hu = ban.firstChild;
  if (!hu) { hu = document.createElement("div"); ban.appendChild(hu); }
  hu.className = "hu " + (nho ? "nho" : "quen");
  hu.innerHTML = nho ? HU_V : HU_X;
  void hu.offsetWidth;                    // buộc tính lại kiểu để hoạt ảnh chạy lại từ đầu
  hu.classList.add("chay");
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
/**
 * Đồng hồ đã DỪNG ở mốc này (ms). null = đang chạy bình thường.
 *
 * `ms` sinh ra để đo THỌI GIAN TRUY XUẤT — mất bao lâu để moi từ ra khỏi đầu.
 * Mở nguồn ra đọc lại câu gốc, hay sang Gemini hỏi, thì đó không còn là truy
 * xuất nữa — mà đồng hồ thì vẫn chạy. Đọc năm phút rồi bấm Nhớ là lượt ấy
 * được ghi "rất chậm" (`MS_TOI_DA` kẹp ở 60 giây), và `T_NET.rat_cham = 0,85` thì
 * giãn cách CO LẠI — bị phạt vì đã chịu khó đi đọc lại.
 *
 * Nên dừng hẳn tại lúc rời thẻ, chứ không phải tạm dừng rồi chạy tiếp: quay
 * lại thì đã nhìn thấy ngữ cảnh rồi, phần sau đó cũng chẳng đo được gì nữa.
 */
let msDaDung = null;

/** Dừng đồng hồ ngay tại đây. Gọi nhiều lần thì giữ mốc ĐẦU TIÊN. */
function dungDongHo() {
  if (msDaDung !== null) return;
  if (mocHienThe) msDaDung = Math.round(performance.now() - mocHienThe);
  else if (baiDien && baiDien.moc) msDaDung = Math.round(performance.now() - baiDien.moc);
}

function showCard(giuLat, xem) {
  if (window.NhipDoc) window.NhipDoc.dung();   // thẻ mới: nhịp của thẻ cũ phải tắt
  // `xem`: đang xem lại một thẻ đã chấm (xemThe). Gọi không tham số = quay về thẻ đang học.
  if (!xem) session.xem = null;
  const it = xem || session.queue[0];
  theTrenMan = it;
  $("stCard").style.visibility = "";            // thẻ bay đi đã giấu nó cho tới lúc này
  if (!it) { finishStudy(); return; }
  // Bài điền khuyết: dựng đề TRƯỚC khi vẽ gì. Không dựng được (câu hay bản dịch vừa mất)
  // thì bỏ thẻ này khỏi buổi chứ không kẹt ở một màn trống.
  let de = null;
  if (it._d === "dien") {
    de = window.CauDien.dungDe(it, items, Math.random);
    if (!de) { session.queue.shift(); showCard(); return; }
  }
  mocHienThe = performance.now();
  msDaDung = null;
  const daLat = giuLat && $("stGrade").style.display !== "none";

  $("stBody").style.display = "";
  $("stDone").style.display = "none";
  /*
   * Nói luôn ĐANG KIỂM ĐƯỜNG NÀO và từ này đang được mấy điểm.
   *
   * Từ khi mỗi đường một lịch riêng, cùng một từ có thể hiện ra dưới bốn kiểu
   * đề khác nhau. Không nói ra thì người học gặp đề nghe của một từ mình vừa
   * làm đề nhìn hôm qua và tưởng app hỏi lặp. Còn con số điểm thì đây là chỗ
   * nó cần có mặt nhất: ngay lúc người ta đang bỏ công ra làm cho nó lên.
   */
  veTienTrinh(it);

  const laNghe = it._d === "nghe";
  const laDien = it._d === "dien";
  $("stNgheMat").style.display = laNghe ? "" : "none";
  $("stDienMat").style.display = laDien ? "" : "none";
  /*
   * Dọn màn KẾT QUẢ ở đây chứ không chỉ trong veBaiDien.
   *
   * veBaiDien chỉ chạy khi thẻ kế LẠI là một bài điền khuyết. Thẻ kế là thẻ nhìn
   * hay thẻ nghe thì nút Tiếp và lớp kết quả nằm lại nguyên đó, chờ sẵn cho
   * bài liên kết sau — và phím cách lúc ấy bấm nhầm vào nút Tiếp cũ.
   */
  if (!laDien) {
    $("stDienTiep").style.display = "none";
    $("stDienO").classList.remove("kq");
    tiepBaiDien = null;
  }
  /*
   * BÀI LIÊN KẾT: GIẤU CẢ CỤM ĐẦU THẺ — NÓ CHÍNH LÀ ĐÁP ÁN.
   *
   * Chiều cũ thì tiêu đề thẻ là CÂU HỎI ("nhặt các từ cùng nghĩa với 悲鳴"), nên
   * hiện ra là đúng. Chiều đảo thì nó là ĐÁP ÁN, và không chỉ một chỗ rò:
   *
   *   - `#stMatChu`  con chữ to đùng, cộng nút loa ĐỌC TO từ gốc;
   *   - `#stThaoTac` "Nghe lại 2:41" mở đúng câu chứa từ ấy, "Ghi chú" có thể
   *                  nhắc tên nó, "Hỏi Gemini" chép cả từ vào bộ nhớ tạm;
   *   - `#stGhiAm`   bản thu của chính mình, phát lên là nghe thấy từ gốc.
   *
   * Cùng một lẽ với thẻ NGHE, vốn đã giấu `#stMatChu` từ lâu: thấy chữ là mắt
   * đọc mất, tai không phải làm gì.
   *
   * Không mất chức năng nào: `veKetQuaLien` bày lại cả cụm này ngay sau khi
   * chấm, nên mọi nút vẫn dùng được — chỉ là sau khi đã trả lời.
   */
  const anDau = laNghe || laDien;
  $("stMatChu").style.display = anDau ? "none" : "";
  for (const id of ["stThaoTac", "stGhiAm"]) {
    const o = $(id);
    if (o) o.style.display = laDien ? "none" : "";
  }
  if (laDien) veBaiDien(it, de);
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
  $("stReveal").style.display = laDien ? "none" : "";
  $("stGrade").style.display = "none";
  // Thẻ nghe tự phát một lượt ngay: bắt bấm thêm một nút nữa mới nghe là thừa.
  //
  // Nhớ lại hẹn giờ để HUỶ nó ở thẻ sau: bấm Nhớ trong vòng 120ms kể từ lúc thẻ
  // hiện ra thì hẹn cũ nổ trên thẻ mới, và người ta nghe câu của từ trước.
  if (henPhat) { clearTimeout(henPhat); henPhat = null; }
  if (laNghe && !daLat && !xem) henPhat = setTimeout(() => { henPhat = null; phatCauNghe(); }, 120);
  if (daLat || xem) revealCard();
  veXemLai(xem);
  window.TheVuot.vao($("stCard"));
}

/** Nhãn "xem lại" + trạng thái hai nút mũi tên dưới thẻ. */
function veXemLai(xem) {
  const b = xem && session.xem ? session.lichSu[session.xem.i] : null;
  const tag = $("stXemTag");
  if (tag) {
    tag.hidden = !b;
    if (b) tag.textContent = (b.nho ? T("Xem lại · đã chấm: Nhớ") : T("Xem lại · đã chấm: Quên"))
      + (laBaiChon(b.duong) ? " · " + T("bài chọn đáp án, chỉ để xem") : "");
    tag.className = "st-xemtag " + (b ? (b.nho ? "nho" : "quen") : "");
  }
  if (b && laBaiChon(b.duong)) $("stGrade").style.display = "none";
  const n = (session.lichSu || []).length;
  const truoc = $("stTruoc"), sau = $("stSau");
  if (truoc) truoc.disabled = !n || (!!session.xem && session.xem.i === 0);
  if (sau) sau.disabled = !session.xem && session.queue.length < 2;
}

/**
 * Xin bản dịch cho câu của thẻ nghe, và NÓI RA khi không xin được.
 *
 * Bản trước dịch hụt thì gán chuỗi rỗng vào chỗ ấy — tức là một dòng trống,
 * nhìn y hệt như chưa bao giờ có tính năng này. Người dùng thử rồi báo "vẫn
 * chưa dịch được cả câu", mà thật ra mã có chạy, chỉ là hỏng lặng lẽ.
 *
 * Hỏng thì phải thấy được, và phải bấm lại được: mạng chập một lượt không có
 * nghĩa là lượt sau cũng chập.
 */
/**
 * Khối NGỮ CẢNH đặt ngay dưới nghĩa của từ: câu đã gặp từ ấy (từ được tô đậm)
 * và bản dịch của câu.
 *
 * Nghĩa trong từ điển là nghĩa chung; câu gốc mới cho thấy từ ấy đang mang nghĩa
 * nào, nên hai thứ phải nằm sát nhau. Bản dịch chưa có thì:
 *   - `tuDich` = true (thẻ học, người đang đứng chờ): xin dịch ngay;
 *   - ngược lại (danh sách hàng trăm mục): hiện nút "Dịch câu" — không tự bắn
 *     hàng trăm lượt gọi mạng chỉ vì mở sổ. Lượt bồi nền (boiThemDuong) sẽ dịch
 *     dần, mở lần sau là có.
 */
function khoiNguCanh(it, tuDich) {
  const h = window.CauNghe.hienThi(it);
  if (!h) return null;
  const box = el("div", "nguc");
  const c = el("div", "nguc-cau");
  if (h.tu) {
    c.appendChild(document.createTextNode(h.cau.slice(0, h.tu[0])));
    c.appendChild(el("mark", "nguc-tu", h.cau.slice(h.tu[0], h.tu[1])));
    c.appendChild(document.createTextNode(h.cau.slice(h.tu[1])));
  } else c.textContent = h.cau;
  box.appendChild(c);
  const d = el("div", "nguc-dich", h.dich);
  box.appendChild(d);
  if (!h.dich) {
    const xin = () => {
      d.className = "nguc-dich";
      d.onclick = null;
      d.textContent = T("Đang dịch câu…");
      chrome.runtime.sendMessage({ type: "DICH_NGU_CANH", key: it.key }, (kq) => {
        const t = (!chrome.runtime.lastError && kq && kq.ok && kq.dich) ? kq.dich : "";
        if (t) {
          d.textContent = t;
          it.cauNghe = it.cauNghe ? Object.assign({}, it.cauNghe, { dich: t }) : it.cauNghe;
          if (!it.cauNghe) it.src = Object.assign({}, it.src, { cauDich: t });
        } else {
          d.className = "nguc-dich nut-lai";
          d.textContent = T("Dịch câu");
          d.onclick = xin;
        }
      });
    };
    if (tuDich) xin();
    else { d.className = "nguc-dich nut-lai"; d.textContent = T("Dịch câu"); d.onclick = xin; }
  }
  return box;
}

function xinDichCau(it, o) {
  const key = it.key;
  o.textContent = T("Đang dịch câu…");
  o.classList.remove("nut-lai");
  o.onclick = null;
  chrome.runtime.sendMessage({ type: "DICH_CAU_NGHE", key: key }, (kq) => {
    // Thẻ có thể đã lật sang cái khác trong lúc chờ mạng.
    const nay = theCardHienTai();
    if (!nay || nay.key !== key) return;
    const t = (!chrome.runtime.lastError && kq && kq.ok && kq.dich) ? kq.dich : "";
    if (t) {
      o.textContent = t;
      it.cauNghe = Object.assign({}, it.cauNghe || {}, { dich: t });
      return;
    }
    o.textContent = T("Chưa dịch được câu — bấm để thử lại");
    o.classList.add("nut-lai");
    o.onclick = () => xinDichCau(it, o);
  });
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
    /*
     * Bản dịch của CẢ CÂU, không phải nghĩa của mỗi từ đang học.
     *
     * Nghe được một câu mà không biết câu ấy nói gì thì bài nghe mất nửa giá
     * trị: người học nhận ra từ nhưng không hiểu nó đang làm gì trong câu.
     * Lượt bồi nền dịch với hạn ngắn nên có mục về tay trắng — gặp mục như thế
     * thì xin dịch NGAY tại đây, vì lúc này người ta đang đứng chờ.
     */
    const dOng = el("div", "t-small muted", (it.cauNghe || {}).dich || T("Đang dịch câu…"));
    o.appendChild(dOng);
    if (!(it.cauNghe || {}).dich) xinDichCau(it, dOng);
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
  // Ngữ cảnh + bản dịch ngay sau nghĩa. Thẻ NGHE đã bày cả câu ở trên rồi.
  if (it._d !== "nghe") {
    const ngc = khoiNguCanh(it, true);
    if (ngc) $("stMean").appendChild(ngc);
  }
  // Ghi chú riêng chỉ hiện SAU khi lật thẻ — nó thường chứa luôn đáp án.
  if (coGhiChu(it)) $("stMyNote").appendChild(khoiGhiChu((it.note || "").trim(), it.hoiAi));
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

async function grade(remembered, tuVuot) {
  // Đang xem lại một thẻ đã chấm: bấm Nhớ/Quên là chấm lại thẻ ấy.
  if (session.xem) { await chamLaiXem(remembered, tuVuot); return; }
  // Bài liên kết tự chấm bằng nút Xong; phím tắt 1/2 không được cướp lượt.
  if (session.queue[0] && session.queue[0]._d === "dien") return;
  // Chấm ĐÚNG thẻ đang hiện trên màn, rồi mới rút nó ra khỏi hàng.
  const it = theCardHienTai();
  if (!it) return;
  const vt = session.queue.indexOf(it);
  if (vt >= 0) session.queue.splice(vt, 1); else session.queue.shift();
  // Thẻ bay đi (vuốt đã tự dựng bản sao rồi), thẻ kế hiện lên ngay sau.
  if (!tuVuot) window.TheVuot.bay($("stCard"), remembered, 0);
  hieuUng(remembered);
  coVu(remembered);
  // Chốt giờ TRƯỚC mọi lượt await: chờ ghi sổ xong mới đo là đo cả tốc độ ổ đĩa.
  const ms = msDaDung !== null ? msDaDung
    : (mocHienThe ? Math.round(performance.now() - mocHienThe) : 0);
  mocHienThe = 0; msDaDung = null;
  // Điểm TRƯỚC lượt chấm, để lời báo nói được là nó vừa nhích lên bao nhiêu.
  const truocDiem = window.Srs.diemTu(it).tong;
  const kqCham = await gradeWord(it.key, remembered, ms, it._d || "nhin");
  if (!kqCham) { showCard(); return; }
  let banSao = null;
  if (remembered) session.done++;
  else {
    session.again++;
    /*
     * TRẦN LẶP TRONG MỘT BUỔI.
     *
     * Quên thì học lại cuối hàng — đúng, nhưng không phải mãi. Một từ chưa vào
     * đầu có thể quay vòng cả chục lượt trong cùng một buổi, và đó chính là thứ
     * làm người ta thấy "sao toàn gặp lại mấy từ này" rồi bỏ app. Đo trên bản
     * cũ: trung bình 128 lần gặp mỗi từ trong 180 ngày, từ bị gặp nhiều nhất
     * 305 lần.
     *
     * Gặp lại hai lượt trong một buổi là đủ để kéo nó vào trí nhớ ngắn hạn;
     * quá đó thì việc cần làm là NGỦ MỘT ĐÊM rồi gặp lại, không phải cày thêm.
     */
    const kh = it.key + "|" + (it._d || "nhin");
    session.lapBuoi = session.lapBuoi || {};
    session.lapBuoi[kh] = (session.lapBuoi[kh] || 0) + 1;
    if (session.lapBuoi[kh] < LAP_TOI_DA) {
      banSao = Object.assign({}, it);
      session.queue.push(banSao);                   // quên -> học lại cuối hàng
    } else {
      toast(T("Từ này để mai gặp lại — hôm nay đủ rồi"));
    }
  }
  // Nhớ lại lượt chấm này để phím ← lấy về được. Chỉ giữ vài lượt gần nhất:
  // đây là để chữa bấm nhầm, không phải để đi ngược cả buổi học.
  if (kqCham) {
    session.lichSu = (session.lichSu || []).concat([{
      the: it, key: it.key, duong: it._d || "nhin", nho: remembered,
      truoc: kqCham.truoc, tkTruoc: kqCham.tkTruoc, sau: kqCham.duong, tkSau: kqCham.tk, banSao: banSao,
      vuaToiDa: !!kqCham.vuaToiDa
    }]).slice(-20);
  }

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
  const mucSau = nbSau[it.key];
  const oCu = items.find((x) => x.key === it.key);
  if (oCu && mucSau) Object.assign(oCu, mucSau);
  if (kqCham.vuaToiDa) {
    toast(T("Đạt mức tối đa — từ này đã được đóng băng. Mở lại ở nút “Đang đóng băng”."), "good");
    if (oCu) oCu.dongBang = 1;
  } else {
    toast(chuBaoCham(remembered, truocDiem, mucSau, it._d || "nhin"));
  }

  const tiep = () => showCard();
  if (moi.length) {
    // Chờ xem hết chúc mừng rồi mới sang thẻ tiếp — nếu không thì popup che
    // mất thẻ mới và người dùng bấm nhầm.
    window.TienDo.anMung(moi, tiep);
  } else {
    tiep();
  }
}

/* ==================================================================== */
/* Bài điền khuyết: câu ngữ cảnh bị đục lỗ, chọn từ gốc                 */
/* ==================================================================== */
/*
 * Lời hỏi là BẢN DỊCH tiếng Việt của câu đã gặp từ; câu tiếng Nhật hiện bên dưới
 * với chỗ của từ bị đục lỗ; bốn ô là từ gốc lẫn ba từ nhiễu lấy từ chính sổ tay.
 * Dựng đề ở cau-dien.js (dùng chung với Android). Chọn một ô là chấm luôn: mỗi đề
 * chỉ có MỘT đáp án đúng, nên không cần nút "Xong".
 *
 * Chấm đúng thì NHỚ, sai thì QUÊN — cùng đường chấm `gradeWord` với các bài khác,
 * đường riêng "dien" có lịch và điểm riêng, gộp chung vào điểm của từ.
 */
let baiDien = null;         // { it, de, moc }

function veBaiDien(it, de) {
  baiDien = { it: it, de: de, moc: performance.now() };
  msDaDung = null;
  $("stDienDich").textContent = de.dich;
  const cau = $("stDienCau");
  cau.textContent = "";
  cau.className = "dien-cau" + (NGU === "ja" ? " ja" : "");
  de.doan.forEach((d, i) => {
    cau.appendChild(document.createTextNode(d));
    if (i < de.doan.length - 1) cau.appendChild(el("span", "dien-lo", window.CauDien.LO));
  });
  $("stDienKq").textContent = "";
  $("stDienTiep").style.display = "none";
  tiepBaiDien = null;
  const khung = $("stDienO");
  khung.textContent = "";
  khung.classList.remove("kq");
  de.o.forEach((w, i) => {
    const b = el("button", "dien-omot");
    b.type = "button";
    // Số phím tắt (1–9), vẽ bằng CSS (::before) để KHÔNG lẫn vào chữ của ô.
    if (i < 9) b.dataset.phim = String(i + 1);
    b.appendChild(el("span", "dien-omot-tu" + (NGU === "ja" ? " ja" : ""), w));
    b.addEventListener("click", () => chonDien(w));
    khung.appendChild(b);
  });
}

async function chonDien(chon) {
  if (!baiDien) return;
  const b = baiDien;
  baiDien = null;                                  // chặn bấm hai ô một lượt
  const ms = msDaDung !== null ? msDaDung : Math.round(performance.now() - b.moc);
  msDaDung = null;
  const nho = window.CauDien.cham(b.de, chon);
  veKetQuaDien(b, chon, nho, ms);
  hieuUng(nho);
  coVu(nho);
  // BỎ thẻ này khỏi hàng đợi trước mọi lượt await, không thì showCard() dựng lại đúng đề này.
  session.queue.shift();
  const daCham = await gradeWord(b.it.key, nho, ms, "dien");
  if (!daCham) { showCard(); return; }
  if (daCham.vuaToiDa) {
    toast(T("Đạt mức tối đa — từ này đã được đóng băng. Mở lại ở nút “Đang đóng băng”."), "good");
    const oCu = items.find((x) => x.key === b.it.key);
    if (oCu) oCu.dongBang = 1;
  }
  const moi = await theoDoi.ghiLuotOn(nho);
  syncSoon();
  let banSao = null;
  if (nho) session.done++;
  else {
    session.again++;
    // Cùng trần lặp với thẻ thường (LAP_TOI_DA): quên thì học lại cuối hàng, nhưng không mãi.
    const kh = b.it.key + "|dien";
    session.lapBuoi = session.lapBuoi || {};
    session.lapBuoi[kh] = (session.lapBuoi[kh] || 0) + 1;
    if (session.lapBuoi[kh] < LAP_TOI_DA) { banSao = Object.assign({}, b.it); session.queue.push(banSao); }
    else toast(T("Từ này để mai gặp lại — hôm nay đủ rồi"));
  }
  session.lichSu = (session.lichSu || []).concat([{
    the: b.it, key: b.it.key, duong: "dien", nho: nho,
    truoc: daCham.truoc, tkTruoc: daCham.tkTruoc, sau: daCham.duong, tkSau: daCham.tk, banSao: banSao,
    vuaToiDa: !!daCham.vuaToiDa
  }]).slice(-20);
  /*
   * KHÔNG tự sang thẻ kế: đứng lại chờ người học bấm Tiếp (hoặc J / Space). Đây đúng
   * là lúc đáng đọc nhất — câu đã đầy đủ, nghĩa của từ, đáp án — nên không tua đi.
   */
  tiepBaiDien = () => {
    tiepBaiDien = null;
    if (moi.length) window.TienDo.anMung(moi, showCard); else showCard();
  };
  $("stDienTiep").style.display = "";
  $("stDienTiep").focus();
}

/** Đang chờ bấm Tiếp ở màn kết quả bài điền khuyết. null = không chờ ai cả. */
let tiepBaiDien = null;

/**
 * Màn KẾT QUẢ: ô đúng xanh, ô chọn nhầm đỏ gạch; chỗ trống được điền lại bằng đúng
 * đoạn chữ trong câu; hiện từ gốc kèm nghĩa. Trả lại cụm đầu thẻ (con chữ, nút loa,
 * Mở nguồn, bản thu) vốn bị giấu lúc làm bài vì nó chính là đáp án.
 */
function veKetQuaDien(b, chon, nho, ms) {
  $("stMatChu").style.display = "";
  for (const id of ["stThaoTac", "stGhiAm"]) {
    const o = $(id);
    if (o) o.style.display = "";
  }
  const de = b.de;
  const khung = $("stDienO");
  khung.classList.add("kq");
  for (const nut of khung.querySelectorAll(".dien-omot")) {
    const w = nut.querySelector(".dien-omot-tu").textContent;
    nut.disabled = true;
    if (w === de.dung) nut.classList.add("dung");
    else if (w === chon) nut.classList.add("sai");
  }
  // Điền lại chỗ trống bằng chính đoạn chữ trong câu.
  const cau = $("stDienCau");
  cau.textContent = "";
  de.doan.forEach((d, i) => {
    cau.appendChild(document.createTextNode(d));
    if (i < de.doan.length - 1) cau.appendChild(el("span", "dien-lap" + (nho ? "" : " sai"), de.mat));
  });
  const t = Math.round(ms / 100) / 10;
  const nghia = (b.it.means || []).slice(0, 2).join("; ");
  $("stDienKq").textContent = (nho ? T2("Đúng rồi · {t} giây", { t: t }) : T2("Chưa đúng · {t} giây", { t: t }))
    + " — " + de.dung + (nghia ? " : " + nghia : "");
}

/* ==================================================================== */
/* Đi lui, đi tới giữa các thẻ                                          */
/* ==================================================================== */

/**
 * Hai giá trị có CÙNG NỘI DUNG không, không kể thứ tự khoá.
 *
 * So bằng JSON.stringify trần thì sai ngay: chrome.storage trả object với khoá
 * xếp theo ABC, còn bản trong bộ nhớ giữ thứ tự lúc tạo — cùng một lượt chấm mà
 * hai chuỗi khác nhau, và hoàn tác lúc nào cũng bị từ chối là "đã thay đổi ở cửa
 * sổ khác".
 */
function cungNoiDung(a, b) {
  const chuan = (v) => {
    if (Array.isArray(v)) return v.map(chuan);
    if (v && typeof v === "object") {
      const r = {};
      for (const k of Object.keys(v).sort()) r[k] = chuan(v[k]);
      return r;
    }
    return v;
  };
  return JSON.stringify(chuan(a)) === JSON.stringify(chuan(b));
}

/**
 * HOÀN TÁC một lượt chấm đã ghi (phần tử của `session.lichSu`).
 *
 * Bấm nhầm Nhớ thành Quên là chuyện xảy ra thật, và với bản cũ thì không có
 * đường chữa: cấp đã tụt, lịch đã đổi. Nên hoàn tác phải trả lại ĐÚNG trạng
 * thái cũ của đường đó — kể cả thống kê nhịp bấm, nếu không thì một lượt bấm
 * nhầm 20 giây còn nằm lại làm lệch mọi lượt chấm sau.
 *
 * Chỉ làm khi đường ấy của mục vẫn đúng như ngay sau lượt chấm (`sau`): đã đổi
 * ở cửa sổ khác, hay chính thẻ quên ấy đã được hỏi lại và chấm tiếp, thì quay về
 * `truoc` là xoá mất lượt chấm MỚI hơn — nên từ chối.
 *
 * @returns {Promise<boolean>} true nếu đã hoàn tác; lượt chấm được gỡ khỏi lịch sử
 */
async function huyLuot(b) {
  const daHoanTac = await suaSoTay(async () => {
    const kho = await chrome.storage.local.get(["notebook", "nhipMs"]);
    const nb = kho.notebook || {};
    const e = nb[b.key];
    if (!e || e.del || window.Srs.biChan(e, b.duong, Date.now())) return false;
    if (b.sau && !cungNoiDung((e.duong || {})[b.duong], b.sau)) return false;
    const d = Object.assign({}, e.duong || {});
    if (b.truoc) d[b.duong] = b.truoc; else delete d[b.duong];
    const moi = Object.assign({}, e, { duong: d, ts: Date.now() });
    // Lượt chấm vừa đẩy từ lên mức tối đa và đóng băng nó: hoàn tác thì gỡ luôn.
    if (b.vuaToiDa) delete moi.dongBang;
    moi.srs = window.Srs.gomSrs(moi) || { lv: -1, due: Date.now(), ts: Date.now() };
    nb[b.key] = moi;
    const ghi = { notebook: nb };
    const tk = kho.nhipMs || {};
    if (b.tkTruoc && typeof b.tkTruoc.n === "number"
        && (!b.tkSau || cungNoiDung(tk[b.duong], b.tkSau))) {
      tk[b.duong] = b.tkTruoc;
      ghi.nhipMs = tk;
    }
    await chrome.storage.local.set(ghi);
    nhipMs = tk;
    return true;
  });
  if (!daHoanTac) return false;
  const vi = (session.lichSu || []).indexOf(b);
  if (vi >= 0) session.lichSu.splice(vi, 1);
  if (b.nho) session.done = Math.max(0, session.done - 1);
  else {
    session.again = Math.max(0, session.again - 1);
    // Lượt "quên" đã xếp một bản sao xuống cuối hàng — bỏ nó đi, không thì thẻ
    // này còn hiện lại một lần nữa dù lượt chấm đã bị huỷ.
    const i = session.queue.indexOf(b.banSao);
    if (i >= 0) session.queue.splice(i, 1);
  }
  return true;
}

/**
 * XEM LẠI CÁC THẺ ĐÃ CHẤM — hai nút mũi tên dưới thẻ, và phím ← →.
 *
 * Nút ‹ lùi từng thẻ đã chấm trong buổi này; nút › đi tới lại, và đi quá thẻ cuối
 * thì về thẻ đang học dở. Thẻ hiện ở trạng thái đã lật, kèm nhãn "đã chấm: Nhớ/Quên".
 * Chỉ XEM thì lượt chấm cũ giữ nguyên. Bấm Nhớ/Quên khác với lần trước thì là CHẤM
 * LẠI: lượt cũ bị huỷ (huyLuot) rồi mới chấm lượt mới, nên một thẻ không bao giờ bị
 * tính hai lần trong cùng buổi.
 *
 * Bài chọn đáp án (đồng/trái nghĩa…) tự chấm theo kết quả chọn, nên ở đây chỉ xem.
 */
const laBaiChon = (d) => d === "dien";

function xemThe(i) {
  const b = (session.lichSu || [])[i];
  if (!b) return;
  session.xem = { i: i };
  const the = b.the;
  showCard(false, laBaiChon(the._d) ? Object.assign({}, the, { _d: "nhin", _xem: true }) : the);
}
function xemTruoc() {
  const n = (session.lichSu || []).length;
  const i = session.xem ? session.xem.i - 1 : n - 1;
  if (!n || i < 0) { toast(T("Không còn thẻ nào để quay lại"), "bad"); return; }
  xemThe(i);
}
function xemSau() {
  if (!session.xem) { boQuaThe(); return; }
  const i = session.xem.i + 1;
  if (i >= session.lichSu.length) { session.xem = null; showCard(); } else xemThe(i);
}
/** Chấm lại một thẻ đang xem. @returns {Promise<boolean>} true nếu đã chấm lại xong */
async function chamLaiXem(nho, tuVuot) {
  const b = session.lichSu[session.xem.i];
  if (!b) return false;
  if (laBaiChon(b.duong)) return false;
  if (b.nho === nho) { toast(T("Giữ nguyên kết quả đã chấm")); xemSau(); return true; }
  if (!(await huyLuot(b))) {
    toast(T("Tiến độ đã thay đổi ở cửa sổ khác. Không thể hoàn tác lượt cũ."), "bad");
    return false;
  }
  session.xem = null;
  session.queue.unshift(b.the);
  theTrenMan = b.the;
  await grade(nho, tuVuot);
  return true;
}

/**
 * Phím →: để dành thẻ này lại cuối hàng, KHÔNG chấm.
 *
 * Có một cảnh dễ trượt: bấm 2 (Nhớ) xong, cửa sổ 3 giây đang mở, MẶT THẺ VẪN LÀ
 * TỪ VỪA CHẤM — rồi bấm → để đi tiếp cho nhanh. Lúc đó thẻ ấy đã ra khỏi hàng
 * đợi rồi, và nếu cứ `push` nó vào cuối thì nó quay lại hỏi thêm một lần nữa
 * trong cùng buổi học. Chấm hai lần một buổi là cấp nhảy hai bậc từ một lần
 * nhớ — thổi phồng tiến độ mà không ai thấy.
 *
 * Nên: thẻ CÒN trong hàng thì mới để dành; thẻ đã chấm rồi thì → chỉ có nghĩa
 * là "thôi, đi tiếp".
 */
function boQuaThe() {
  const it = theCardHienTai();
  if (!it) return;
  const i = session.queue.indexOf(it);
  if (i < 0) { showCard(); return; }                 // đã chấm rồi: chỉ đi tiếp
  if (session.queue.length < 2) { toast(T("Chỉ còn mỗi thẻ này thôi"), "bad"); return; }
  session.queue.splice(i, 1);
  session.queue.push(it);
  showCard();
}

/**
 * Mở nguồn ra CHIA ĐÔI MÀN HÌNH.
 *
 * Chrome không cho nhét một trang web bất kỳ vào bảng bên (side panel) — bảng
 * bên chỉ nhận trang của chính extension, mà nhúng trang ngoài vào iframe thì
 * phần lớn website chặn thẳng bằng X-Frame-Options. Nên làm bằng CỬA SỔ: thu
 * cửa sổ sổ tay về nửa trái, mở nguồn ở nửa phải. Kết quả nhìn giống hệt chia
 * đôi màn hình, mà không phụ thuộc vào website có cho nhúng hay không.
 */
/**
 * Mở nguồn ở MỘT CỬA SỔ RIÊNG — và KHÔNG đụng vào cửa sổ đang mở.
 *
 * Bản trước thu cửa sổ sổ tay về nửa màn hình rồi đặt nguồn vào nửa kia. Ý thì
 * hay, thực tế thì phiền: mỗi lần mở nguồn là cả chỗ làm việc bị xô lệch, và
 * muốn về như cũ phải tự kéo lại từng cửa sổ.
 *
 * Giờ chỉ mở thêm một cửa sổ, để nguyên mọi thứ khác. Xem xong gõ Ctrl+W là
 * cửa sổ ấy đóng và sổ tay hiện lại y nguyên chỗ cũ — không phải kéo gì hết.
 */
async function moCuaSoRieng(url) {
  try {
    await chrome.windows.create({ url: url, focused: true });
    return true;
  } catch (e) {
    // Không mở nổi cửa sổ (chính sách trình duyệt) thì thà một thẻ mới còn hơn
    // không mở được nguồn.
    try { await chrome.tabs.create({ url: url }); return true; } catch (e2) { return false; }
  }
}

/** Một thẻ quay lại tối đa ngần này lượt trong MỘT buổi. Xem grade(). */
const LAP_TOI_DA = 2;

/*
 * CỬA SỔ "MỞ LẠI NGUỒN NGHE LẠI?" ĐÃ BỊ GỠ HẲN.
 *
 * Nó từng chặn giữa hai thẻ: chấm xong một từ là hiện ra một câu hỏi kèm đếm
 * ngược ba giây. Ý định là "một cái cửa mở hé", nhưng đặt giữa mạch ôn thì nó
 * là một cái chắn: mỗi thẻ có nguồn đều phải bấm thêm một lần để đi tiếp, hoặc
 * ngồi đợi ba giây. Một buổi trăm thẻ là trăm lần như thế.
 *
 * Nút "Mở nguồn" vẫn nằm ngay trên mặt thẻ, bấm lúc nào cũng được — nên cái
 * cửa ấy không hề mất, chỉ thôi tự chìa ra trước mặt. Và phần đáng lo của việc
 * đi đọc nguồn — bị chấm là "rất chậm" — nay do `dungDongHo` lo.
 */

async function deleteCurrentCard() {
  const it = theCardHienTai();
  if (!it) return;
  await capNhat((nb) => {
    const original = nb[it.key];
    lastDeleted = original ? { key: it.key, entry: Object.assign({}, original) } : null;
    if (nb[it.key]) nb[it.key] = window.Muc.biaMo(nb[it.key]);
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
  theTrenMan = null;
  if (window.NhacTau) window.NhacTau.tat();
  $("stBody").style.display = "none";
  $("stDone").style.display = "";
  $("stProg").textContent = "";
  $("stDoneIcon").innerHTML = window.Icon("confetti", { size: 56, weight: "duo" });

  /*
   * Buổi ôn riêng thì tổng kết bằng CHÍNH CON SỐ đã hứa lúc bấm vào chip.
   *
   * Người ta bấm vào "72/100" vì muốn thấy nó nhích lên; báo lại chuỗi ngày và
   * mục tiêu hôm nay là trả lời một câu hỏi khác hẳn câu họ vừa hỏi.
   */
  if (session.rieng) {
    const nb = (await chrome.storage.local.get("notebook")).notebook || {};
    const moi = nb[session.rieng];
    const d = moi ? window.Srs.diemTu(moi) : null;
    $("stSummary").textContent = d
      ? T2("{t} giờ được {d}/100 · {b}", { t: moi.word, d: d.tong, b: T(d.ten) })
      : T2("Đã ôn {n} bài", { n: session.done });
    await load();
    syncSoon();
    return;
  }

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
  theTrenMan = null;
  if (window.NhacTau) window.NhacTau.tat();
  ovl.classList.remove("show");
  load();
  if ($("viewProgress").classList.contains("show")) veTienDo();
}

$("stDienTiep").addEventListener("click", () => { if (tiepBaiDien) tiepBaiDien(); });
$("study").addEventListener("click", startStudy);
if ($("studyPath")) $("studyPath").addEventListener("click", startStudyDuong);
$("stReveal").addEventListener("click", revealCard);
/**
 * Phát câu nghe. Tốc độ theo cấp của chính đường nghe — xem Srs.tocDoNghe.
 * Cấp thấp nghe chậm cho rõ từng chữ, lên cấp thì đẩy về tốc độ nói thật.
 */
let henPhat = null;

function phatCauNghe() {
  const it = theCardHienTai();
  if (!it || !it.cauNghe || !it.cauNghe.cau) return;
  const lv = ((it.duong || {}).nghe || {}).lv;
  ttsSpeak(it.cauNghe.cau, NGU === "ja" ? "ja" : "en", { rate: window.Srs.tocDoNghe(lv) });
}
$("stNghePhat").addEventListener("click", phatCauNghe);
// Bảng phím tắt: ẩn được, và nhớ lựa chọn đó.
if ($("stPhimAn")) $("stPhimAn").addEventListener("click", async () => {
  $("stPhim").style.display = "none";
  const { settings } = await chrome.storage.local.get("settings");
  await chrome.storage.local.set({ settings: Object.assign({}, settings || {}, { anPhim: true }) });
});
$("stTruoc").innerHTML = window.Icon("arrow-left", { size: 20 });
$("stSau").innerHTML = window.Icon("arrow-right", { size: 20 });
$("stTruoc").addEventListener("click", xemTruoc);
$("stSau").addEventListener("click", xemSau);
// Vuốt thẻ: phải = Nhớ, trái = Quên. Chỉ khi đã lật thẻ — chấm mà chưa thấy nghĩa thì vô nghĩa.
window.TheVuot.gan($("stCard"), {
  duocKeo: () => $("stGrade").style.display !== "none",
  chamXong: (nho) => grade(nho, true),
  chuaDuoc: () => toast(T("Hãy hiện nghĩa trước rồi mới vuốt để chấm (Space)"))
});
$("gKnow").addEventListener("click", () => grade(true));
$("gForgot").addEventListener("click", () => grade(false));
$("stSpk").addEventListener("click", () => { const it = theCardHienTai(); if (it) speak(it.word, it.audio); });
$("stClose").addEventListener("click", closeStudy);
$("stDoneClose").addEventListener("click", closeStudy);
$("stDel").addEventListener("click", deleteCurrentCard);
$("stUndoBtn").addEventListener("click", undoDelete);
$("stGemini").addEventListener("click", () => { const it = theCardHienTai(); if (it) moGemini(it); });
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
  /*
   * Có lớp nằm ĐÈ LÊN buổi học thì phím là của lớp ấy, không phải của màn học.
   *
   * Thứ tự lớp: buổi học 260 < phiếu 280 < chúc mừng 300 < xem ảnh 350. Thiếu
   * cổng này thì một cái Esc lúc đang hiện lời chúc mừng huy hiệu vừa tắt lời
   * chúc mừng vừa gọi `closeStudy` — đang học tự dưng thoát ra.
   */
  if (document.querySelector("#tdCelebrate.show, .anhxem.show")) return;
  if (e.key === "Escape") { closeStudy(); return; }
  // Đang gõ chữ vào ô nào đó (ghi chú, sửa nghĩa…) thì phím là của ô ấy; và
  // Ctrl/⌘/Alt + phím là của trình duyệt (Ctrl+F tìm chữ chẳng lẽ lại là "Quên").
  const t = e.target;
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
  phimHoc(e);
});

/**
 * Phím tắt trong buổi học.
 *
 *   Space   lật thẻ (kể cả bài nghe) · đã lật rồi: mở nguồn
 *           · màn kết quả bài điền khuyết: Tiếp
 *   Enter   như Space
 *   F / J   Quên / Nhớ (sau khi lật)        1 / 2  như cũ, giữ cho ai đã quen
 *   A       phát âm từ · bài nghe: nghe lại câu (lúc nào cũng được; từ còn phải giấu)
 *   1–9     bài điền khuyết: chọn ô đó và chấm ngay (mỗi đề chỉ có MỘT đáp án đúng)
 *   J       màn kết quả bài điền khuyết: Tiếp
 *   ← →     xem lại / chấm lại các thẻ đã chấm (xemTruoc / xemSau)
 */
function phimHoc(e) {
  const it = theCardHienTai();
  const laNghe = !!it && it._d === "nghe";
  const daLat = $("stGrade").style.display !== "none";
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const ma = e.code || "";
  const laPhim = (ch) => k === ch || ma === "Key" + ch.toUpperCase();

  if (k === " " || k === "Enter") {
    e.preventDefault();
    // Màn kết quả bài liên kết đang chờ: phím cách là "Tiếp".
    if (tiepBaiDien) { tiepBaiDien(); return; }
    if (baiDien) return;                              // đang làm bài: chọn bằng phím 1–9
    if ($("stReveal").style.display !== "none") { revealCard(); return; }
    if (it && it.src && it.src.url) openSource(it, true);
  } else if (laPhim("j")) {
    e.preventDefault();
    if (tiepBaiDien) tiepBaiDien();
    else if (daLat) grade(true);
  } else if (laPhim("f")) {
    e.preventDefault();
    if (daLat) grade(false);
  } else if (laPhim("a")) {
    e.preventDefault();
    if (!it) return;
    if (laNghe) phatCauNghe();                       // bài nghe: A = nghe lại câu, lúc nào cũng được
    else if (it._d === "dien") { if (tiepBaiDien) speak(it.word, it.audio); }
    else speak(it.word, it.audio);
  } else if (k === "ArrowLeft") { e.preventDefault(); xemTruoc(); }
  else if (k === "ArrowRight") { e.preventDefault(); xemSau(); }
  else if (baiDien && /^[1-9]$/.test(k)) {
    const o = $("stDienO").querySelectorAll(".dien-omot")[Number(k) - 1];
    if (o && !o.disabled) { e.preventDefault(); chonDien(o.querySelector(".dien-omot-tu").textContent); }
  }
  else if (k === "1" && daLat) grade(false);
  else if (k === "2" && daLat) grade(true);
  else if (k === "0" || k === "Delete") { e.preventDefault(); deleteCurrentCard(); }
}

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
  "Furigana theo chữ Hán", "Phát âm", "Ngày lưu",
  // Thêm ở CUỐI, không chen vào giữa: file cũ vẫn nạp được vì bộ nạp bám theo
  // TÊN cột chứ không theo vị trí, nhưng chen vào giữa thì người nào đang mở
  // file cũ trong Excel để đối chiếu sẽ thấy lệch cột.
  "Link Gemini"
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
    it.ts ? new Date(it.ts).toISOString().slice(0, 10) : "",
    (it.hoiAi && it.hoiAi.url) || ""
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
        if (!(cu.hoiAi && cu.hoiAi.url) && o(h, "Link Gemini")) {
          cu.hoiAi = { url: o(h, "Link Gemini"), ts: Date.now() }; doi = true;
        }
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
      if (o(h, "Link Gemini")) ne.hoiAi = { url: o(h, "Link Gemini"), ts: Date.now() };
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
  const { hoc, nguPhapSrs } = await chrome.storage.local.get(["hoc", "nguPhapSrs"]);
  download("neutrondict-sotay-backup.json",
    JSON.stringify({ notebook: s.nb, decks: s.decks, hoc: hoc || null, nguPhapSrs: nguPhapSrs || {} }),
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
    if (imp && imp.nguPhapSrs) await suaSoTay(async () => {
      const cu = (await chrome.storage.local.get("nguPhapSrs")).nguPhapSrs || {};
      await chrome.storage.local.set({ nguPhapSrs: window.Muc.tron(cu, imp.nguPhapSrs) });
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
    for (const it of list) if (nb[it.key]) nb[it.key] = window.Muc.biaMo(nb[it.key]);
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
                       ytTuBat: false, ytPhoi: true, nhip: true, nhipToc: 320, nhacPhut: 0, coVu: true, nhacTau: true, tach: true, chiaDoi: true };

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
  if ($("setChiaDoi")) $("setChiaDoi").checked = S.chiaDoi !== false;
  if ($("stPhim")) $("stPhim").style.display = S.anPhim ? "none" : "";
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
      tach: $("setTach") ? $("setTach").checked : true,
      chiaDoi: $("setChiaDoi") ? $("setChiaDoi").checked : true
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
  $("viewGrammar").classList.toggle("show", ten === "grammar");
  // Hai nút trên đầu chỉ nói về Sổ tay / Tiến độ; Luyện nói vào bằng nút riêng
  // của nó, nên lúc đang ở đó thì không nút nào sáng cả.
  $("pageList").classList.toggle("active", ten === "list");
  $("pageProgress").classList.toggle("active", ten === "progress");
  if (ten === "progress") { veTienDo(); veSoDo(); }
  if (ten === "speak") veLuyenNoi();
  if (ten === "grammar") window.NguPhapUI.lamMoi();
  veThanhChon();
}
$("pageList").addEventListener("click", () => moMan("list"));
$("pageProgress").addEventListener("click", () => moMan("progress"));

async function ghiNguPhap(q, ketQua, chiBang) {
  const ra = await suaSoTay(async () => {
    const data = await chrome.storage.local.get(["notebook", "ytKho", "nguPhapSrs"]);
    const nb = data.notebook || {}, ytKho = data.ytKho, kho = data.nguPhapSrs || {};
    const ds = window.NguPhap.boSungTuKho(Object.entries(window.Ngu.locSo(nb, "ja")).map(([key,v]) => Object.assign({ key },v)), ytKho);
    if (!window.NguPhap.danhSach(ds).some(b => b.cau === q.cau)) return null;
    const key = window.NguPhapSrs.khoa(q.cau);
    const bayGio = Date.now();
    let moi;
    if (ketQua === "mo") moi = window.NguPhapSrs.dongBang(kho[key], q.cau, false, bayGio);
    else {
      // `chiBang`: chế độ luyện tự do — không chấm cấp/lịch, chỉ đóng băng câu làm đúng.
      moi = chiBang ? kho[key] : window.NguPhapSrs.cham(kho[key], q.cau, ketQua, bayGio, q.onId, q.tsDau);
      if (!moi && !chiBang) return null;
      // Làm đúng (kể cả sai rồi sửa) thì đóng băng luôn, để khỏi phải luyện lại câu ấy.
      if (ketQua === "dung" || ketQua === "sua") moi = window.NguPhapSrs.dongBang(moi, q.cau, true, bayGio);
    }
    if (!moi) return null;
    kho[key] = moi;
    await chrome.storage.local.set({ nguPhapSrs: kho });
    return moi;
  });
  if (ra) syncSoon();
  return ra;
}

window.NguPhapUI.khoiTao({
  docLich: async () => (await chrome.storage.local.get("nguPhapSrs")).nguPhapSrs || {},
  ghiKetQua: ghiNguPhap,
  layMuc: async () => {
    const { notebook, ytKho } = await chrome.storage.local.get(["notebook", "ytKho"]);
    const ds = Object.entries(window.Ngu.locSo(notebook || {}, "ja")).map(([key,v]) => Object.assign({ key },v));
    return window.NguPhap.boSungTuKho(ds.filter((it) => !it.del), ytKho);
  },
  ngonNgu: () => NGU,
  dichCau: (cau) => new Promise((giai) => {
    let xong = false;
    const tra = (text) => { if (!xong) { xong = true; giai(text || ""); } };
    chrome.runtime.sendMessage({ type: "TRANSLATE", text: cau, from: "ja", to: "vi" }, (res) => {
      tra(chrome.runtime.lastError || !res || !res.ok ? "" : res.text);
    });
    setTimeout(() => tra(""), 10000);
  })
});
$("grammar").addEventListener("click", () => moMan("grammar"));
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
  $("grammar").innerHTML = window.Icon("books", { size: 18 }) + '<span class="lb" data-chu>Luyện ngữ pháp</span>';

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
  gan("stGemini", "sparkle", "Hỏi Gemini");
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
/*
 * Phần vá không cần mạng ghi xong trước và báo về bằng tin này. Đợi cả lượt vá
 * trả lời thì có khi đợi cả phút — giai đoạn hỏi mạng nằm sau nó.
 */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "VA_FURIGANA_XONG") load();
});

function vaFurigana() {
  try {
    chrome.runtime.sendMessage({ type: "VA_FURIGANA", toiDa: 20 }, (kq) => {
      if (chrome.runtime.lastError) return;
      if (kq && kq.ok && kq.count) load();
    });
  } catch (e) { /* không vá được thì thôi, sổ vẫn dùng bình thường */ }
}

/**
 * Bồi câu ngữ cảnh và tập đồng/trái nghĩa cho những từ đã có trong sổ từ trước.
 * Không có hai thứ ấy thì bài nghe và hai bài liên kết không bao giờ mở ra —
 * xem boiThemDuong bên background.js.
 */
function boiThemDuong() {
  try {
    chrome.runtime.sendMessage({ type: "BOI_DUONG", toiDa: 24 }, (kq) => {
      if (chrome.runtime.lastError) return;
      if (kq && kq.ok && kq.count) load();
    });
  } catch (e) { /* bồi không được thì sổ vẫn học được bằng đường nhìn */ }
}

/**
 * Bày SỐ ĐO THẬT ra cho người học xem.
 *
 * Bảng này trả lời đúng một câu: "ở bậc N, app bắt tôi chờ X ngày, và tôi nhớ
 * được bao nhiêu phần trăm?". Bậc nào tỉ lệ nhớ thấp hẳn thì bậc ấy đang quá
 * dài với chính người này; cao quá thì đang quá ngắn, tức là đang ôn thừa.
 *
 * Cố ý ghi rõ ô nào CHƯA ĐỦ MẪU. Nhìn một ô có 4 lượt rồi kết luận thang sai là
 * cách chắc chắn nhất để chỉnh hỏng.
 */
async function veSoDo() {
  const o = $("soDoBang");
  if (!o) return;
  const kho = await chrome.storage.local.get("soDoSrs");
  const ds = window.Srs.docSoDo(kho.soDoSrs || {});
  o.textContent = "";
  if (!ds.length) {
    o.appendChild(el("div", "t-small faint",
      T("Chưa có số đo nào. Học vài buổi rồi quay lại — mỗi lượt ôn có chờ qua ngày mới được tính.")));
    return;
  }
  const b = el("table", "sodo");
  const th = el("tr");
  for (const c of [T("Kiểu bài"), T("Bậc"), T("Chờ"), T("Số lượt"), T("Nhớ được")]) {
    th.appendChild(el("th", null, c));
  }
  b.appendChild(th);
  for (const x of ds) {
    const tr = el("tr", x.duMau ? "du" : "thieu");
    tr.appendChild(el("td", null, T(window.Srs.TEN_DUONG[x.duong] || x.duong)));
    tr.appendChild(el("td", null, String(x.lv < 0 ? 0 : x.lv + 1)));
    tr.appendChild(el("td", null, T2("{n} ngày", { n: x.ngayTB })));
    tr.appendChild(el("td", null, String(x.n)));
    const tl = el("td", null, x.tyLe + "%");
    if (!x.duMau) tl.title = T2("Mới {n} lượt — chưa đủ để tin (cần {c})",
      { n: x.n, c: window.Srs.DU_SO_DO });
    tr.appendChild(tl);
    b.appendChild(tr);
  }
  o.appendChild(b);
  o.appendChild(el("div", "t-small faint", T2(
    "Dòng mờ là chưa đủ mẫu (dưới {c} lượt). Đủ mẫu rồi thì bậc nào nhớ dưới 80% là đang quá dài với bạn, trên 95% là đang ôn thừa.",
    { c: window.Srs.DU_SO_DO })));
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
  $("grammar").style.display = NGU === "ja" ? "" : "none";
  if (NGU !== "ja" && $("viewGrammar").classList.contains("show")) moMan("list");
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
  vungCuon().scrollTop = 0;       // danh sách của ngôn ngữ kia: về đầu mới đúng
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
  nguSanSang();
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
  boiThemDuong();

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
