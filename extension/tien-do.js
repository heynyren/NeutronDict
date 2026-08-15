/**
 * THEO DÕI QUÁ TRÌNH HỌC & PHẦN THƯỞNG
 * =====================================
 * Cùng một cơ chế với app Denken 3 Shuu: mục tiêu mỗi ngày, chuỗi ngày liên
 * tiếp, lịch nhiệt, và huy hiệu cho những mốc đáng nhớ.
 *
 * Vì sao sổ tay từ vựng cũng cần thứ này
 * --------------------------------------
 * Sóng học tập (SRS) trả lời câu "hôm nay ôn từ nào", nhưng không trả lời câu
 * "mình có đang đều đặn không". Thiếu vế thứ hai thì bỏ ba ngày cũng chẳng thấy
 * gì khác, mà bỏ ba ngày là bắt đầu bỏ hẳn. Chuỗi ngày và huy hiệu chính là vế
 * thứ hai: chúng làm cho việc *có mặt* mỗi ngày trở thành một thứ nhìn thấy
 * được, đếm được, và mất đi được.
 *
 * Ba nguyên tắc, chép từ Denken vì đã chứng minh là đúng
 * ------------------------------------------------------
 *  1. Huy hiệu đã đạt thì KHÔNG BAO GIỜ mất, kể cả khi số liệu tụt xuống. Phần
 *     thưởng mà đòi lại được thì không phải phần thưởng.
 *  2. Chuỗi ngày hôm nay chưa đạt thì đếm lùi từ hôm qua, để lúc bạn còn đang
 *     học dở buổi sáng chuỗi không hiện ra là đã đứt.
 *  3. Icon chứ không phải emoji. Huy hiệu là thứ người ta khoe; để phông chữ
 *     của máy vẽ hộ thì mỗi máy một kiểu.
 *
 * File này chỉ lo phần tính toán và vẽ. Chỗ lấy/ghi dữ liệu do app truyền vào,
 * nên dùng chung được cho cả extension (chrome.storage) lẫn app Android
 * (Capacitor Preferences).
 */
"use strict";
(function (root) {

  const NGAY = 86400000;
  const MUC_TIEU_MAC_DINH = 20;

  /* ==================================================================== */
  /* Ngày tháng                                                           */
  /* ==================================================================== */

  /** Ngày hôm nay theo GIỜ ĐỊA PHƯƠNG, dạng YYYY-MM-DD.
      Không dùng toISOString() — nó quy về UTC, nên ở Việt Nam từ 0h đến 7h
      sáng sẽ bị tính sang ngày hôm trước, chuỗi ngày đứt oan. */
  function homNay(d) {
    const t = d ? new Date(d) : new Date();
    const p = (n) => String(n).padStart(2, "0");
    return t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate());
  }

  /** Cộng/trừ n ngày vào một chuỗi YYYY-MM-DD. */
  function themNgay(iso, n) {
    const [y, m, d] = iso.split("-").map(Number);
    return homNay(new Date(y, m - 1, d + n));
  }

  /** Số ngày từ a tới b (b - a). */
  function cachNgay(a, b) {
    const p = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).getTime(); };
    return Math.round((p(b) - p(a)) / NGAY);
  }

  function ngayVi(iso) {
    const [y, m, d] = iso.split("-");
    return d + "/" + m + "/" + y;
  }

  /* ==================================================================== */
  /* Dữ liệu                                                              */
  /* ==================================================================== */

  /**
   * Hình dạng dữ liệu lưu xuống đĩa (khoá "hoc"):
   *
   *   {
   *     v: 1,
   *     goal: 20,                       mục tiêu số lượt ôn mỗi ngày
   *     goalTs: 1723600000000,          lúc đổi mục tiêu, để trộn khi đồng bộ
   *     log: { "2026-08-14": { r, y, n, s, sm, km } },
   *     badges: { "chuoi-7": "2026-08-14" }
   *   }
   *
   * Trong mỗi ngày:  r = số lượt ôn, y = nhớ, n = quên, s = số mục lưu mới,
   *                  sm = có ôn trước 6h sáng, km = có ôn sau 23h.
   */
  function rong() {
    return { v: 1, goal: MUC_TIEU_MAC_DINH, goalTs: 0, log: {}, badges: {} };
  }

  function chuanHoa(d) {
    const o = rong();
    if (!d || typeof d !== "object") return o;
    if (typeof d.goal === "number" && d.goal > 0) o.goal = Math.min(500, Math.round(d.goal));
    if (typeof d.goalTs === "number") o.goalTs = d.goalTs;
    if (d.log && typeof d.log === "object") {
      for (const k in d.log) {
        const v = d.log[k] || {};
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
        o.log[k] = {
          r: v.r || 0, y: v.y || 0, n: v.n || 0, s: v.s || 0,
          sm: v.sm ? 1 : 0, km: v.km ? 1 : 0
        };
      }
    }
    if (d.badges && typeof d.badges === "object") {
      for (const k in d.badges) if (typeof d.badges[k] === "string") o.badges[k] = d.badges[k];
    }
    return o;
  }

  /**
   * Trộn hai bản tiến độ khi đồng bộ giữa máy tính và điện thoại.
   *
   * KHÔNG dùng luật "bản mới hơn thắng" như sổ tay. Sổ tay là danh sách các mục
   * độc lập, mỗi mục có dấu thời gian riêng nên so ts là đủ. Tiến độ thì khác:
   * hôm nay bạn ôn 8 lượt trên điện thoại và 5 lượt trên máy tính — đó là 8 và 5
   * lượt thật, bản nào "mới hơn" cũng không được phép xoá bản kia. Nên:
   *
   *   · số lượt trong ngày  -> lấy số LỚN HƠN (không cộng dồn: hai máy đã đồng
   *     bộ với nhau thì cộng sẽ đếm hai lần chính những lượt vừa nhận về)
   *   · huy hiệu            -> hợp của hai bên, giữ NGÀY SỚM HƠN
   *   · mục tiêu ngày       -> bản đổi sau cùng thắng
   */
  function tron(a, b) {
    const x = chuanHoa(a), y = chuanHoa(b);
    const out = rong();
    out.goal = (y.goalTs > x.goalTs) ? y.goal : x.goal;
    out.goalTs = Math.max(x.goalTs, y.goalTs);

    const ngay = new Set([...Object.keys(x.log), ...Object.keys(y.log)]);
    for (const d of ngay) {
      const p = x.log[d] || {}, q = y.log[d] || {};
      out.log[d] = {
        r: Math.max(p.r || 0, q.r || 0),
        y: Math.max(p.y || 0, q.y || 0),
        n: Math.max(p.n || 0, q.n || 0),
        s: Math.max(p.s || 0, q.s || 0),
        sm: (p.sm || q.sm) ? 1 : 0,
        km: (p.km || q.km) ? 1 : 0
      };
    }

    const hh = new Set([...Object.keys(x.badges), ...Object.keys(y.badges)]);
    for (const id of hh) {
      const p = x.badges[id], q = y.badges[id];
      out.badges[id] = (!p || (q && q < p)) ? q : p;
    }
    return out;
  }

  /* ==================================================================== */
  /* Tính toán                                                            */
  /* ==================================================================== */

  /**
   * Chuỗi ngày liên tiếp đạt mục tiêu.
   * Hôm nay chưa đạt thì đếm lùi từ hôm qua — xem ghi chú nguyên tắc 2 ở đầu file.
   */
  function chuoi(d, ngay) {
    const goal = Math.max(1, d.goal);
    const dat = (iso) => (d.log[iso] ? d.log[iso].r : 0) >= goal;

    const tuHomQua = !dat(ngay);
    let hienTai = 0;
    let con = tuHomQua ? themNgay(ngay, -1) : ngay;
    while (dat(con)) { hienTai += 1; con = themNgay(con, -1); }

    let dai = 0, chay = 0;
    for (const iso of Object.keys(d.log).sort()) {
      if (!dat(iso)) continue;
      chay = dat(themNgay(iso, -1)) ? chay + 1 : 1;
      if (chay > dai) dai = chay;
    }

    return {
      hienTai,
      dai: Math.max(dai, hienTai),
      // Hôm qua có chuỗi mà hôm nay chưa đạt -> chuỗi đang treo, nên nhắc.
      lungLay: tuHomQua && hienTai > 0
    };
  }

  /** Tổng số lượt ôn từ trước tới nay. */
  function tongLuot(d) {
    let n = 0;
    for (const k in d.log) n += d.log[k].r || 0;
    return n;
  }

  /** Số ngày đã đạt mục tiêu. */
  function soNgayDat(d) {
    const goal = Math.max(1, d.goal);
    let n = 0;
    for (const k in d.log) if ((d.log[k].r || 0) >= goal) n += 1;
    return n;
  }

  /** Số lượt ôn nhiều nhất trong một ngày. */
  function kyLucNgay(d) {
    let n = 0;
    for (const k in d.log) if ((d.log[k].r || 0) > n) n = d.log[k].r || 0;
    return n;
  }

  function coCo(d, co) {
    for (const k in d.log) if (d.log[k][co]) return true;
    return false;
  }

  /**
   * Gộp mọi con số cần cho màn Tiến độ và cho việc xét huy hiệu.
   *
   * @param {object} d    dữ liệu tiến độ
   * @param {object} them số liệu lấy từ sổ tay (tổng từ, đã thuộc, ghi chú…)
   */
  function tongQuan(d, them) {
    const t = homNay();
    const nay = d.log[t] || { r: 0, y: 0, n: 0, s: 0 };
    const goal = Math.max(1, d.goal);
    return {
      ngay: t,
      goal,
      homNay: {
        on: nay.r || 0,
        nho: nay.y || 0,
        quen: nay.n || 0,
        luu: nay.s || 0,
        conLai: Math.max(0, goal - (nay.r || 0)),
        ti: Math.min(1, (nay.r || 0) / goal),
        dat: (nay.r || 0) >= goal
      },
      chuoi: chuoi(d, t),
      tongLuot: tongLuot(d),
      soNgayDat: soNgayDat(d),
      soNgayCoHoc: Object.keys(d.log).filter((k) => (d.log[k].r || 0) > 0).length,
      kyLucNgay: kyLucNgay(d),
      daySom: coCo(d, "sm"),
      thucKhuya: coCo(d, "km"),
      huyHieu: d.badges,
      so: them || {}
    };
  }

  /** Chuỗi ngày liên tục (kể cả ngày trống) để vẽ lịch nhiệt. */
  function chuoiNgay(d, soNgay, den) {
    const cuoi = den || homNay();
    const out = [];
    for (let i = soNgay - 1; i >= 0; i -= 1) {
      const iso = themNgay(cuoi, -i);
      const v = d.log[iso] || {};
      out.push({ ngay: iso, on: v.r || 0, nho: v.y || 0, quen: v.n || 0 });
    }
    return out;
  }

  /* ==================================================================== */
  /* Huy hiệu                                                             */
  /* ==================================================================== */

  const ti = (v, dich) => Math.max(0, Math.min(1, v / dich));

  /** Huy hiệu dạng "chạm mốc N": chỉ cần một hàm lấy số hiện tại. */
  function moc(id, icon, ten, mo_ta, dich, lay) {
    return {
      id, icon, ten, mo_ta, dich,
      dat: (v) => lay(v) >= dich,
      tien: (v) => ti(lay(v), dich),
      hienTai: lay
    };
  }

  /**
   * Danh sách huy hiệu của app từ điển.
   *
   * Cố ý pha ba loại, vì ba loại này thưởng cho ba kiểu cố gắng khác nhau:
   *   · đều đặn  — chuỗi ngày, tổng lượt ôn
   *   · tích luỹ — số từ trong sổ, số từ đã nhớ lâu
   *   · chăm chút — sửa bản dịch, viết ghi chú, phân loại sổ con
   *
   * Người chỉ ôn cho xong vẫn có huy hiệu, mà người tỉ mẩn dịch cho đúng chuyên
   * ngành cũng có huy hiệu riêng — không ai bị bỏ lại.
   */
  const HUY_HIEU = [
    moc("bat-dau", "plant", "Hạt giống", "Ôn lượt đầu tiên trong app", 1,
      (v) => v.tongLuot),
    moc("dung-hen", "target", "Đúng hẹn", "Đạt mục tiêu ngày lần đầu tiên", 1,
      (v) => v.soNgayDat),

    moc("chuoi-3", "fire", "Ba ngày liền", "Giữ chuỗi 3 ngày liên tiếp", 3,
      (v) => v.chuoi.dai),
    moc("chuoi-7", "fire", "Trọn một tuần", "Giữ chuỗi 7 ngày liên tiếp", 7,
      (v) => v.chuoi.dai),
    moc("chuoi-30", "mountains", "Một tháng bền bỉ", "Giữ chuỗi 30 ngày liên tiếp", 30,
      (v) => v.chuoi.dai),
    moc("chuoi-100", "diamond", "Trăm ngày", "Giữ chuỗi 100 ngày liên tiếp", 100,
      (v) => v.chuoi.dai),

    moc("on-100", "book-open-text", "100 lượt ôn", "Ôn 100 lượt trong app", 100,
      (v) => v.tongLuot),
    moc("on-500", "books", "500 lượt ôn", "Ôn 500 lượt trong app", 500,
      (v) => v.tongLuot),
    moc("on-2000", "brain", "2000 lượt ôn", "Ôn 2000 lượt trong app", 2000,
      (v) => v.tongLuot),

    moc("so-100", "notebook", "Sổ tay 100 mục", "Lưu 100 mục vào sổ tay", 100,
      (v) => v.so.tong || 0),
    moc("so-500", "notebook", "Sổ tay 500 mục", "Lưu 500 mục vào sổ tay", 500,
      (v) => v.so.tong || 0),

    moc("nho-lau-100", "seal-check", "Nhớ lâu", "100 mục đạt chu kỳ ôn từ 14 ngày", 100,
      (v) => v.so.nhoLau || 0),
    moc("nho-lau-500", "trophy", "Vốn liếng dày", "500 mục đạt chu kỳ ôn từ 14 ngày", 500,
      (v) => v.so.nhoLau || 0),

    moc("hieu-dinh-20", "translate", "Người hiệu đính", "Sửa lại 20 bản dịch cho sát nghĩa", 20,
      (v) => v.so.daSua || 0),
    moc("hieu-dinh-100", "crown", "Thợ cả chuyên ngành", "Sửa lại 100 bản dịch", 100,
      (v) => v.so.daSua || 0),
    moc("ghi-chu-20", "quotes", "Người chú giải", "Viết ghi chú cho 20 mục", 20,
      (v) => v.so.coGhiChu || 0),

    moc("ngan-nap", "path", "Ngăn nắp", "Có 5 sổ con đang dùng", 5,
      (v) => v.so.soCon || 0),
    moc("yeu-thich-50", "heart", "Có gu", "Gắn tim cho 50 mục", 50,
      (v) => v.so.thich || 0),

    moc("bung-no", "lightning", "Bùng nổ", "Ôn 50 lượt trong cùng một ngày", 50,
      (v) => v.kyLucNgay),
    moc("deu-dan-30", "calendar-check", "Ba mươi ngày có mặt", "Có học trong 30 ngày khác nhau", 30,
      (v) => v.soNgayCoHoc),

    {
      id: "day-som", icon: "sun-horizon", ten: "Dậy sớm",
      mo_ta: "Ôn bài trước 6 giờ sáng", dich: 1,
      dat: (v) => v.daySom, tien: (v) => (v.daySom ? 1 : 0), hienTai: (v) => (v.daySom ? 1 : 0)
    },
    {
      id: "khuya", icon: "alarm", ten: "Cú đêm",
      mo_ta: "Ôn bài sau 11 giờ đêm", dich: 1,
      dat: (v) => v.thucKhuya, tien: (v) => (v.thucKhuya ? 1 : 0), hienTai: (v) => (v.thucKhuya ? 1 : 0)
    },
    {
      id: "ban-sach", icon: "sun-horizon", ten: "Bàn học sạch",
      mo_ta: "Ôn hết mục đến hạn, khi sổ đã có ít nhất 20 mục trong chu kỳ",
      dich: 1,
      // "Hết mục đến hạn" chỉ là thành tích khi bạn thật sự đang chạy một lịch ôn
      // có quy mô. Người vừa cài app, sổ trống trơn, cũng thoả điều kiện đó về
      // mặt chữ nghĩa — nên phải có đủ 20 mục nằm trong chu kỳ mới tính.
      dat: (v) => (v.so.denHan || 0) === 0 && (v.so.trongChuKy || 0) >= 20,
      tien: (v) => ((v.so.denHan || 0) === 0 ? ti(v.so.trongChuKy || 0, 20) : 0),
      hienTai: (v) => ((v.so.denHan || 0) === 0 ? 1 : 0)
    },
    {
      id: "vuot-chi-tieu", icon: "rocket-launch", ten: "Vượt chỉ tiêu",
      mo_ta: "Ôn gấp đôi mục tiêu ngày trong một ngày", dich: 1,
      dat: (v) => v.kyLucNgay >= v.goal * 2,
      tien: (v) => ti(v.kyLucNgay, Math.max(2, v.goal * 2)),
      hienTai: (v) => v.kyLucNgay
    },
  ];

  /**
   * Huy hiệu vừa mới đạt được, trả về map { id: ngày }.
   * Chỉ thêm huy hiệu chưa có; không bao giờ gỡ huy hiệu cũ (nguyên tắc 1).
   */
  function moiDat(view, daCo, ngay) {
    const moi = {};
    for (const hh of HUY_HIEU) {
      if (daCo[hh.id]) continue;
      let ok = false;
      try { ok = !!hh.dat(view); } catch (e) { ok = false; }
      if (ok) moi[hh.id] = ngay;
    }
    return moi;
  }

  /* ==================================================================== */
  /* Bộ theo dõi — nối phần tính toán ở trên với chỗ lưu của từng app       */
  /* ==================================================================== */

  /**
   * @param {{doc:Function, ghi:Function, soLieu?:Function, sauKhiGhi?:Function}} bo
   *   doc()        -> Promise<object|null>  đọc dữ liệu tiến độ đã lưu
   *   ghi(obj)     -> Promise<void>         ghi lại
   *   soLieu()     -> Promise<object>       số liệu phụ lấy từ sổ tay
   *   sauKhiGhi()  -> void                  gọi sau mỗi lần ghi (để hẹn đồng bộ)
   */
  function tao(bo) {
    let d = rong();
    let daNap = false;

    async function nap(ep) {
      if (daNap && !ep) return d;
      d = chuanHoa(await bo.doc());
      daNap = true;
      return d;
    }

    async function luu() {
      await bo.ghi(d);
      if (bo.sauKhiGhi) bo.sauKhiGhi();
    }

    async function xem() {
      await nap();
      const them = bo.soLieu ? await bo.soLieu() : {};
      return tongQuan(d, them);
    }

    /** Ngày hôm nay trong log, tạo nếu chưa có. */
    function oNgay(iso) {
      if (!d.log[iso]) d.log[iso] = { r: 0, y: 0, n: 0, s: 0, sm: 0, km: 0 };
      return d.log[iso];
    }

    /**
     * Ghi nhận một lượt ôn.
     * @returns {Promise<string[]>} id các huy hiệu vừa mở khoá (để hiện chúc mừng)
     */
    async function ghiLuotOn(nho) {
      await nap();
      const iso = homNay();
      const o = oNgay(iso);
      o.r += 1;
      if (nho) o.y += 1; else o.n += 1;
      const gio = new Date().getHours();
      if (gio < 6) o.sm = 1;
      if (gio >= 23) o.km = 1;
      await luu();
      return xetHuyHieu(iso);
    }

    /** Ghi nhận một mục mới được lưu vào sổ tay. */
    async function ghiLuu(soLuong) {
      await nap();
      const iso = homNay();
      oNgay(iso).s += (soLuong || 1);
      await luu();
      return xetHuyHieu(iso);
    }

    /** Xét lại toàn bộ huy hiệu; dùng cả khi chỉ mở màn Tiến độ. */
    async function xetHuyHieu(iso) {
      const view = await xem();
      const moi = moiDat(view, d.badges, iso || homNay());
      const ids = Object.keys(moi);
      if (ids.length) {
        Object.assign(d.badges, moi);
        await luu();
      }
      return ids;
    }

    async function datMucTieu(n) {
      await nap();
      d.goal = Math.max(1, Math.min(500, Math.round(n) || MUC_TIEU_MAC_DINH));
      d.goalTs = Date.now();
      await luu();
      return d.goal;
    }

    return {
      nap,
      xem,
      ghiLuotOn,
      ghiLuu,
      xetHuyHieu,
      datMucTieu,
      lich: (soNgay) => chuoiNgay(d, soNgay),
      tho: () => d,
      dat: (obj) => { d = chuanHoa(obj); daNap = true; }
    };
  }

  /* ==================================================================== */
  /* Vẽ màn Tiến độ                                                       */
  /* ==================================================================== */

  const el = (tag, cls, chu) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (chu != null) e.textContent = chu;
    return e;
  };

  function icon(ten, opt) {
    const s = document.createElement("span");
    s.className = "icwrap";
    s.innerHTML = root.Icon ? root.Icon(ten, opt) : "";
    return s.firstChild || s;
  }

  /** Vòng tròn mục tiêu hôm nay + mấy con số quan trọng nhất. */
  function veHomNay(view) {
    const card = el("div", "card");

    const hang = el("div", "rowx");
    hang.style.gap = "18px";

    const ring = el("div", "ring" + (view.homNay.dat ? " done" : ""));
    ring.style.setProperty("--p", String(Math.round(view.homNay.ti * 100)));
    const val = el("div", "val");
    val.appendChild(el("b", null, String(view.homNay.on)));
    val.appendChild(el("span", null, "/ " + view.goal + " lượt"));
    ring.appendChild(val);
    hang.appendChild(ring);

    const ben = el("div", "grow");
    const tieu = el("div", "t-lead");
    tieu.textContent = view.homNay.dat
      ? "Xong mục tiêu hôm nay"
      : "Còn " + view.homNay.conLai + " lượt nữa là đạt";
    ben.appendChild(tieu);

    const phu = el("div", "t-small muted");
    phu.style.marginTop = "2px";
    phu.textContent = view.homNay.dat
      ? "Ôn thêm bao nhiêu cũng được, chuỗi ngày đã tính rồi."
      : "Mỗi lượt ôn trong tab Học đều được tính vào đây.";
    ben.appendChild(phu);

    const bar = el("div", "bar" + (view.homNay.dat ? " spark" : ""));
    bar.style.marginTop = "12px";
    const fill = el("i");
    fill.style.width = Math.round(view.homNay.ti * 100) + "%";
    bar.appendChild(fill);
    ben.appendChild(bar);

    const dong = el("div", "rowx");
    dong.style.marginTop = "10px";
    dong.style.gap = "14px";
    const bit = (ic, chu, mau) => {
      const s = el("span", "t-tiny");
      s.style.display = "inline-flex";
      s.style.alignItems = "center";
      s.style.gap = "5px";
      if (mau) s.style.color = mau;
      s.appendChild(icon(ic, { size: 15 }));
      s.appendChild(el("span", null, chu));
      return s;
    };
    dong.appendChild(bit("check", view.homNay.nho + " nhớ", "var(--good)"));
    dong.appendChild(bit("arrow-counter-clockwise", view.homNay.quen + " ôn lại", "var(--ink-3)"));
    if (view.homNay.luu) dong.appendChild(bit("plus", view.homNay.luu + " mục mới", "var(--ink-3)"));
    ben.appendChild(dong);

    hang.appendChild(ben);
    card.appendChild(hang);
    return card;
  }

  /** Bốn ô số liệu: chuỗi hiện tại, chuỗi dài nhất, tổng lượt, số ngày có mặt. */
  function veSoLieu(view) {
    const card = el("div", "card");
    const g = el("div", "statgrid");

    const o = (cls, ic, k, v) => {
      const s = el("div", "stat" + (cls ? " " + cls : ""));
      const kk = el("div", "k");
      kk.appendChild(icon(ic, { size: 14 }));
      kk.appendChild(el("span", null, k));
      s.appendChild(kk);
      s.appendChild(el("div", "v", String(v)));
      return s;
    };

    g.appendChild(o("spark", "fire", "Chuỗi ngày", view.chuoi.hienTai));
    g.appendChild(o(null, "trophy", "Dài nhất", view.chuoi.dai));
    g.appendChild(o("accent", "graduation-cap", "Tổng lượt ôn", view.tongLuot));
    g.appendChild(o(null, "calendar-check", "Ngày có mặt", view.soNgayCoHoc));
    card.appendChild(g);

    if (view.chuoi.lungLay) {
      const nhac = el("div", "rowx");
      nhac.style.cssText = "margin-top:12px;padding:10px 12px;border-radius:var(--r-sm);background:var(--warn-soft);color:var(--warn);font-size:13px;font-weight:600";
      nhac.appendChild(icon("warning-circle", { size: 17 }));
      nhac.appendChild(el("span", "grow",
        "Chuỗi " + view.chuoi.hienTai + " ngày đang treo — ôn đủ " + view.goal + " lượt hôm nay là giữ được."));
      card.appendChild(nhac);
    }
    return card;
  }

  /** Lịch nhiệt 17 tuần gần nhất, xếp theo cột tuần như GitHub. */
  function veLich(theoDoi, view) {
    const card = el("div", "card");
    const eb = el("div", "eyebrow");
    eb.appendChild(icon("chart-line-up", { size: 15 }));
    eb.appendChild(el("span", null, "17 tuần gần đây"));
    card.appendChild(eb);

    const ngay = theoDoi.lich(17 * 7);
    // Xếp cho ô đầu tiên rơi đúng thứ Hai, để mỗi cột là một tuần trọn vẹn.
    const dau = ngay[0];
    const thu = dau ? (new Date(dau.ngay + "T00:00:00").getDay() + 6) % 7 : 0;

    const wrap = el("div", "heat");
    let cot = el("div", "wk");
    for (let i = 0; i < thu; i += 1) {
      const o = el("i");
      o.style.visibility = "hidden";
      cot.appendChild(o);
    }
    let trongCot = thu;

    for (const d of ngay) {
      if (trongCot === 7) { wrap.appendChild(cot); cot = el("div", "wk"); trongCot = 0; }
      const o = el("i");
      const muc = d.on === 0 ? 0
        : d.on >= view.goal * 0.6 ? 3
        : d.on >= view.goal * 0.3 ? 2 : 1;
      o.dataset.lv = String(muc);
      if (d.on >= view.goal) o.dataset.goal = "1";
      o.title = ngayVi(d.ngay) + " — " + d.on + " lượt ôn";
      cot.appendChild(o);
      trongCot += 1;
    }
    wrap.appendChild(cot);
    card.appendChild(wrap);

    const chu = el("div", "heatlegend");
    chu.appendChild(el("span", null, "Ít"));
    [0, 1, 2, 3].forEach((lv) => {
      const o = el("i");
      o.style.background = lv === 0 ? "var(--surface-3)"
        : "color-mix(in srgb, var(--accent) " + (lv * 26) + "%, var(--surface-3))";
      chu.appendChild(o);
    });
    chu.appendChild(el("span", null, "Nhiều"));
    const g = el("i", "goal");
    g.style.marginLeft = "8px";
    chu.appendChild(g);
    chu.appendChild(el("span", null, "ngày đạt mục tiêu"));
    card.appendChild(chu);
    return card;
  }

  /** Khu huy hiệu. Đã đạt xếp trước, chưa đạt xếp sau theo mức gần đích. */
  function veHuyHieu(view) {
    const card = el("div", "card");
    const daCo = Object.keys(view.huyHieu).length;

    const eb = el("div", "eyebrow");
    eb.appendChild(icon("medal-military", { size: 15 }));
    eb.appendChild(el("span", null, "Huy hiệu " + daCo + "/" + HUY_HIEU.length));
    card.appendChild(eb);

    const ds = HUY_HIEU.slice().sort((a, b) => {
      const da = view.huyHieu[a.id] ? 1 : 0;
      const db = view.huyHieu[b.id] ? 1 : 0;
      if (da !== db) return db - da;
      if (da) return view.huyHieu[a.id] < view.huyHieu[b.id] ? -1 : 1;
      let ta = 0, tb = 0;
      try { ta = a.tien(view); } catch (e) {}
      try { tb = b.tien(view); } catch (e) {}
      return tb - ta;
    });

    const luoi = el("div", "badgegrid");
    for (const hh of ds) {
      const co = view.huyHieu[hh.id];
      const o = el("div", "badge " + (co ? "earned" : "locked"));
      const sym = el("div", "sym");
      sym.appendChild(icon(hh.icon, { size: 26, weight: co ? "duo" : "line" }));
      o.appendChild(sym);
      o.appendChild(el("div", "nm", hh.ten));
      o.appendChild(el("div", "ds", hh.mo_ta));
      if (co) {
        o.appendChild(el("div", "when", ngayVi(co)));
      } else {
        let t = 0, n = 0;
        try { t = hh.tien(view); n = hh.hienTai(view); } catch (e) {}
        const p = el("div", "prog");
        const f = el("i");
        f.style.width = Math.round(t * 100) + "%";
        p.appendChild(f);
        o.appendChild(p);
        if (hh.dich > 1) {
          const s = el("div", "ds", n + " / " + hh.dich);
          s.style.marginTop = "3px";
          o.appendChild(s);
        }
      }
      luoi.appendChild(o);
    }
    card.appendChild(luoi);
    return card;
  }

  /** Ô đặt mục tiêu ngày. */
  function veMucTieu(theoDoi, view, veLai) {
    const card = el("div", "card");
    const eb = el("div", "eyebrow");
    eb.appendChild(icon("target", { size: 15 }));
    eb.appendChild(el("span", null, "Mục tiêu mỗi ngày"));
    card.appendChild(eb);

    const p = el("div", "t-small muted");
    p.textContent = "Ôn đủ số lượt này là ngày đó được tính vào chuỗi. Đặt vừa sức thôi — chuỗi dài quan trọng hơn con số to.";
    p.style.marginBottom = "12px";
    card.appendChild(p);

    const hang = el("div", "rowx");
    const inp = document.createElement("input");
    inp.type = "number";
    inp.min = "1";
    inp.max = "500";
    inp.value = String(view.goal);
    inp.style.maxWidth = "120px";
    hang.appendChild(inp);

    const nut = el("button", "btn primary");
    nut.innerHTML = (root.Icon ? root.Icon("check", { size: 17 }) : "") + '<span class="lb">Lưu mục tiêu</span>';
    nut.addEventListener("click", async () => {
      await theoDoi.datMucTieu(parseInt(inp.value, 10));
      veLai();
    });
    hang.appendChild(nut);

    for (const n of [10, 20, 30, 50]) {
      const c = el("button", "chip" + (view.goal === n ? " active" : ""));
      c.textContent = String(n);
      c.addEventListener("click", async () => { await theoDoi.datMucTieu(n); veLai(); });
      hang.appendChild(c);
    }
    card.appendChild(hang);
    return card;
  }

  /**
   * Vẽ trọn màn Tiến độ vào một phần tử.
   * @param {HTMLElement} thung  chỗ để vẽ
   * @param {object} theoDoi     bộ theo dõi do tao() trả về
   */
  async function veBang(thung, theoDoi) {
    const view = await theoDoi.xem();
    const veLai = () => { veBang(thung, theoDoi); };
    thung.innerHTML = "";
    thung.appendChild(veHomNay(view));
    thung.appendChild(veSoLieu(view));
    thung.appendChild(veLich(theoDoi, view));
    thung.appendChild(veHuyHieu(view));
    thung.appendChild(veMucTieu(theoDoi, view, veLai));
    return view;
  }

  /* ==================================================================== */
  /* Chúc mừng khi mở khoá huy hiệu                                       */
  /* ==================================================================== */

  const MAU_GIAY = ["#ff8a3d", "#ffd23d", "#34c98a", "#4b8bff", "#b57bff", "#ff6b8a"];

  /**
   * Hiện popup chúc mừng. Huy hiệu chưa đạt thì không báo trước ở đâu cả — chạm
   * mốc lúc đang học mới bật lên. Bất ngờ thì mới vui.
   */
  function anMung(ids, xong) {
    const ds = (ids || [])
      .map((id) => HUY_HIEU.find((h) => h.id === id))
      .filter(Boolean);
    if (!ds.length) { if (xong) xong(); return; }

    let ov = document.getElementById("tdCelebrate");
    if (!ov) {
      ov = el("div", "celebrate");
      ov.id = "tdCelebrate";
      document.body.appendChild(ov);
    }
    ov.innerHTML = "";

    const card = el("div", "cel-card");

    const giay = el("div", "confetti");
    for (let i = 0; i < 26; i += 1) {
      const m = el("i");
      m.style.left = ((i * 3.9) % 100) + "%";
      m.style.background = MAU_GIAY[i % MAU_GIAY.length];
      m.style.animationDelay = ((i % 9) * 0.16) + "s";
      m.style.animationDuration = (2 + (i % 5) * 0.28) + "s";
      giay.appendChild(m);
    }
    card.appendChild(giay);

    card.appendChild(el("div", "kicker",
      ds.length > 1 ? "Mở khoá " + ds.length + " huy hiệu!" : "Mở khoá huy hiệu!"));

    const khoi = el("div", "cel-badges" + (ds.length > 1 ? " many" : ""));
    ds.forEach((hh, i) => {
      const b = el("div", "cel-badge");
      b.style.animationDelay = (i * 0.14) + "s";
      const sym = el("div", "cel-sym");
      sym.appendChild(icon(hh.icon, { size: ds.length > 1 ? 30 : 44, weight: "duo" }));
      b.appendChild(sym);
      b.appendChild(el("div", "cel-name", hh.ten));
      b.appendChild(el("div", "cel-desc", hh.mo_ta));
      khoi.appendChild(b);
    });
    card.appendChild(khoi);

    const nut = el("button", "btn primary block lg");
    nut.innerHTML = (root.Icon ? root.Icon("sparkle", { size: 18 }) : "") + '<span class="lb">Tuyệt vời, học tiếp thôi!</span>';
    card.appendChild(nut);

    const dong = () => {
      ov.classList.remove("show");
      document.removeEventListener("keydown", phim);
      if (xong) xong();
    };
    const phim = (e) => { if (e.key === "Escape" || e.key === "Enter") dong(); };

    nut.addEventListener("click", dong);
    ov.addEventListener("click", (e) => { if (e.target === ov) dong(); });
    document.addEventListener("keydown", phim);

    ov.appendChild(card);
    ov.classList.add("show");
    return dong;
  }

  /* ==================================================================== */

  root.TienDo = {
    MUC_TIEU_MAC_DINH,
    HUY_HIEU,
    homNay,
    themNgay,
    cachNgay,
    ngayVi,
    chuanHoa,
    tron,
    tongQuan,
    tao,
    veBang,
    anMung
  };
})(typeof window !== "undefined" ? window : globalThis);
