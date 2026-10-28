/**
 * Giao diện chế độ "Ôn thi JLPT": chọn màn → bản đồ → chặng → học nhanh → thử thách → kết quả.
 *
 * Dùng chung cho extension và Android. Mọi thứ phụ thuộc app (kho lưu, nạp dữ liệu, đọc to, dịch chữ, icon,
 * thông báo) đi qua một bộ nối `adapter` do mỗi app tự cấp — xem `khoi()`.
 *
 * Không dùng thư viện ngoài, không ảnh; cảnh nền là SVG nhỏ do jlpt-theme.js vẽ.
 */
(function (goc) {
  "use strict";

  const TD = goc.JlptTienDo, CH = goc.JlptCauHoi, TH = goc.JlptTheme, NH = goc.JlptNhac, CG = goc.JlptCanhGioi;

  let A = null;            // bộ nối với app
  let root = null;         // phần tử chứa cả chế độ
  let td = null;           // tiến độ đang dùng
  let mon = null;          // dữ liệu màn đang mở
  let monId = null;
  let chang = [];          // danh sách chặng của màn đang mở
  let chay = null;         // lượt chơi đang diễn ra
  let gioi = null;         // sân khấu cảnh nền của bản đồ đang hiện (xem taoGioi)
  let truyen = null;       // câu chuyện của màn đang mở ({batDau, chang:{id:[câu…]}, xongChuong, thang}); null nếu chưa có
  let phimDang = null;     // hàm xử lý phím đang gắn

  const T = (s) => (A && A.T ? A.T(s) : s);
  const icon = (ten, co) => (A && A.icon ? A.icon(ten, co || 18) : "");

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function nut(cls, html, onClick) {
    const b = el("button", cls); b.type = "button";
    if (html != null) b.innerHTML = html;
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }
  const luu = () => A.ghi(td);

  const giamChuyen = () => !!(goc.matchMedia && goc.matchMedia("(prefers-reduced-motion: reduce)").matches);
  /** Màn hình rộng (máy tính) hay hẹp (điện thoại): quyết định cách xếp bản đồ và độ rộng của cảnh vẽ. */
  const rong = () => (goc.innerWidth || 0) >= 900;
  const am = (nho) => { try { if (A && A.am) A.am(nho); } catch (e) { /* âm thanh chỉ là phần thêm */ } };
  const rung = (ms) => { try { if (goc.navigator && goc.navigator.vibrate) goc.navigator.vibrate(ms); } catch (e) { /* máy không có */ } };

  /** Pháo giấy: một canvas phủ lên `host`, tự gỡ khi hết hạt. Tắt khi người dùng chọn giảm chuyển động. */
  function phaoGiay(host, nang) {
    if (giamChuyen() || !host || !host.appendChild) return;
    const cv = el("canvas", "jl-phao");
    host.appendChild(cv);
    const W = cv.width = host.clientWidth || goc.innerWidth || 360, H = cv.height = host.clientHeight || goc.innerHeight || 640;
    const g = cv.getContext && cv.getContext("2d");
    if (!g) { cv.remove(); return; }
    const MAU = ["#ffd24a", "#ff5d8f", "#3aa6ff", "#3bd49a", "#a855f7", "#ffffff", "#ff9f43"];
    const n = Math.min(nang ? 200 : 120, Math.round(W / (nang ? 6 : 9)));
    const ds = [];
    for (let i = 0; i < n; i++) {
      const trai = nang && i % 2 === 0, phai = nang && i % 2 === 1;
      ds.push({
        x: trai ? 0 : phai ? W : W / 2 + (Math.random() - 0.5) * W * 0.3, y: trai || phai ? H * 0.7 : H * 0.38,
        vx: trai ? 6 + Math.random() * 12 : phai ? -(6 + Math.random() * 12) : (Math.random() - 0.5) * 15,
        vy: -(7 + Math.random() * 13), r: 4 + Math.random() * 6, a: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.4,
        c: MAU[(Math.random() * MAU.length) | 0], vuong: Math.random() < 0.55
      });
    }
    let t0 = 0;
    const khung = (t) => {
      if (!cv.isConnected) return;
      const dt = t0 ? Math.min(2.5, (t - t0) / 16.7) : 1; t0 = t;
      g.clearRect(0, 0, W, H);
      let song = 0;
      for (const p of ds) {
        p.vy += 0.38 * dt; p.vx *= 0.992; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt;
        if (p.y > H + 20) continue;
        song++;
        g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c;
        if (p.vuong) g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); else { g.beginPath(); g.arc(0, 0, p.r / 2, 0, 6.283); g.fill(); }
        g.restore();
      }
      if (song) requestAnimationFrame(khung); else cv.remove();
    };
    requestAnimationFrame(khung);
  }

  /** Số chạy từ 0 lên `den` (ngọc, phần trăm…). `dang(n)` định dạng chữ. */
  function dem(e, den, ms, dang) {
    if (giamChuyen() || den <= 0) { e.textContent = dang(den); return; }
    let t0 = 0;
    const b = (t) => {
      if (!e.isConnected) return;
      if (!t0) t0 = t;
      const k = Math.min(1, (t - t0) / ms);
      e.textContent = dang(Math.round(den * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(b);
    };
    e.textContent = dang(0);
    requestAnimationFrame(b);
  }

  /** Lớp hạt trôi (cánh hoa / bong bóng) phủ cả khung nhìn, nằm yên khi cuộn: dính ở đầu mà cao 0, hạt chảy ra ngoài. */
  function khiQuyen(th, cls) {
    const o = el("div", "jl-khi " + (cls || "") + " " + (th.khi || "canh"));
    for (let i = 0; i < 14; i++) {
      const h = el("i");
      h.style.setProperty("--x", ((i * 71) % 97 + 2) + "%");
      h.style.setProperty("--d", (9 + (i * 7) % 8) + "s");
      h.style.setProperty("--w", (-(i * 1.7)).toFixed(1) + "s");
      h.style.setProperty("--s", (6 + (i * 5) % 9) + "px");
      o.appendChild(h);
    }
    return o;
  }

  /* ================================================================ nhạc nền */

  let nutNhac = null;

  /** Xoá cả khung chế độ rồi gắn lại nút bật/tắt nhạc (nút luôn nằm ở cuối màn hình, mọi màn đều thấy). */
  function lamTrang() {
    dungGioi();
    root.textContent = "";
    if (!nutNhac) {
      nutNhac = nut("jl-nhac", "", () => {
        td.nhac = td.nhac === false;
        luu();
        capNhatNhac(true);
      });
    }
    root.appendChild(nutNhac);
    veNutNhac();
  }
  function veNutNhac() {
    if (!nutNhac) return;
    const bat = td.nhac !== false;
    nutNhac.hidden = !(NH && NH.kha());
    nutNhac.classList.toggle("tat", !bat);
    nutNhac.innerHTML = icon("speaker-high", 22) + "<span class=\"jl-nhac-nt\">♪</span>";   // gạch chéo khi tắt do CSS vẽ (.tat::after)
    nutNhac.title = bat ? T("Tắt nhạc nền") : T("Bật nhạc nền");
    nutNhac.setAttribute("aria-label", nutNhac.title);
    nutNhac.setAttribute("aria-pressed", bat ? "true" : "false");
  }
  /** Đồng bộ nhạc với trạng thái hiện tại: đang ở trong một màn và bật thì phát bài của màn đó, ngược lại thì tắt. */
  function capNhatNhac() {
    veNutNhac();
    // Đang ở trong một màn thì ẩn thanh bên của app (nếu app có) để trò chơi chiếm cả màn hình.
    try { if (A && A.toanMan) A.toanMan(!!monId); } catch (e) { /* tuỳ chọn */ }
    if (!NH) return;
    if (monId && td.nhac !== false) NH.bat(monId); else NH.tat();
  }

  /* ================================================================ khởi động */

  /**
   * @param {Element} r  phần tử chứa
   * @param {object} adapter
   *   doc():Promise<object|null>, ghi(obj):Promise, taiMon(id):Promise<object>,
   *   nghe(text), T(s), icon(ten,co), toast(s), am(nho) — tiếng chuông đúng/sai (tuỳ chọn),
   *   toanMan(bool) — ẩn/hiện thanh bên khi vào/ra một màn (tuỳ chọn), nhacDay — px chừa dưới cho nút nhạc
   */
  async function khoi(r, adapter) {
    A = adapter; root = r;
    root.classList.add("jl-goc");
    root.style.setProperty("--jl-day", (adapter.nhacDay || 18) + "px");
    td = TD.chuan(await A.doc());
    veChonMan();
  }

  /** Gọi mỗi lần người dùng mở màn này (dữ liệu có thể vừa được đồng bộ từ máy khác). */
  async function lamMoi() {
    if (!A) return;
    if (chay) return;                       // đang chơi dở thì đừng đè
    td = TD.chuan(await A.doc());
    if (monId && mon) { veBanDo(false); capNhatNhac(); } else veChonMan();
  }

  /* ================================================================ chọn màn */

  const TRUM = { n3: "boss", n2: "boss" };    // màn có dữ liệu → id trùm cuối

  function veChonMan() {
    monId = null; mon = null; chang = [];
    lamTrang();
    const o = el("div", "jl-chon");
    const dau = el("div", "jl-dau");
    const t = el("div", "jl-dau-chu");
    t.appendChild(el("div", "jl-tieude", T("Ôn thi JLPT")));
    t.appendChild(el("div", "jl-phu", T("Mỗi cấp là một màn chơi, mở sẵn song song — chọn cấp hợp với trình độ của bạn. Vượt từng chặng, đạt từ 60% để đi tiếp.")));
    dau.appendChild(t);
    dau.appendChild(thongKe());
    o.appendChild(dau);

    const ds = el("div", "jl-the-ds");
    let thuTu = 0;
    Object.keys(TH.MON).sort((a, b) => TD.THU_TU_MON.indexOf(a) - TD.THU_TU_MON.indexOf(b)).forEach((id) => {
      const th = TH.MON[id];
      const mo = TD.monMo(td, id, TRUM);
      const m = td.mon[id] || { chang: {} };
      const tong = m.tong || 0;
      const xong = Object.keys(m.chang).filter((k) => TD.qua(m.chang[k].tot || 0)).length;
      const b = el("button", "jl-the" + (mo ? "" : " khoa"));
      b.type = "button";
      b.style.setProperty("--m1", th.mau[0]); b.style.setProperty("--m2", th.mau[1]);
      b.style.setProperty("--i", String(thuTu++));
      b.dataset.mon = id;
      // Cảnh động làm nền thẻ: chọn một chương đẹp nhất của màn (bình minh trên đỉnh / tầng san hô) để xem trước.
      const nen = el("div", "jl-the-canh");
      nen.innerHTML = TH.canh(id, th.xemTruoc == null ? 6 : th.xemTruoc, true);
      b.appendChild(nen);
      b.appendChild(el("div", "jl-the-phu"));
      const e1 = el("div", "jl-the-emoji", th.emoji);
      const nvc = el("div", "jl-the-nv");
      nvc.innerHTML = TH.nhanVat(id);
      b.appendChild(nvc);
      const e2 = el("div", "jl-the-thong");
      e2.appendChild(el("div", "jl-the-cap", th.cap));
      e2.appendChild(el("div", "jl-the-ten", T(th.ten)));
      e2.appendChild(el("div", "jl-the-mo", T(th.phu)));
      const bar = el("div", "jl-bar"); const f = el("i"); f.style.width = (tong ? Math.round((xong / tong) * 100) : 0) + "%"; bar.appendChild(f);
      e2.appendChild(bar);
      e2.appendChild(el("div", "jl-the-so", tong ? xong + "/" + tong + " " + T("chặng") : T("Chưa chơi") + " · " + T("Bấm để vào")));
      b.appendChild(e1); b.appendChild(e2);
      b.addEventListener("click", () => moMon(id));
      ds.appendChild(b);
    });
    TH.SAP_CO.forEach((s) => {
      const b = el("div", "jl-the sap");
      b.style.setProperty("--i", String(thuTu++));
      const nen = el("div", "jl-the-canh");
      nen.innerHTML = TH.canhSapCo(s.id);
      b.appendChild(nen);
      b.appendChild(el("div", "jl-the-phu"));
      b.appendChild(el("div", "jl-the-emoji", s.emoji));
      const e2 = el("div", "jl-the-thong");
      e2.appendChild(el("div", "jl-the-cap", s.cap));
      e2.appendChild(el("div", "jl-the-ten", T(s.ten)));
      e2.appendChild(el("div", "jl-the-sap-tag", T("Sắp có")));
      e2.appendChild(el("div", "jl-the-mo", T("Sẽ mở ngay khi có dữ liệu giáo trình của cấp này.")));
      b.appendChild(e2);
      ds.appendChild(b);
    });
    o.appendChild(ds);

    const thu = el("label", "jl-thu");
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!td.thu; cb.id = "jlThu";
    cb.addEventListener("change", async () => { td.thu = cb.checked; await luu(); veChonMan(); });
    thu.appendChild(cb);
    thu.appendChild(el("span", null, T("Chế độ thử: mở khoá tất cả màn và chặng (để xem thử)")));
    o.appendChild(thu);
    root.appendChild(o);
    capNhatNhac();                          // về màn chọn cấp thì tắt nhạc của màn trước
  }

  function thongKe() {
    const o = el("div", "jl-thongke");
    const ngoc = el("span", "jl-chip"); ngoc.innerHTML = icon("diamond", 16) + "<b>" + td.ngoc + "</b>"; ngoc.title = T("Ngọc");
    const chuoi = el("span", "jl-chip"); chuoi.innerHTML = icon("fire", 16) + "<b>" + td.chuoi + "</b>"; chuoi.title = T("Chuỗi ngày học liên tiếp");
    o.appendChild(ngoc); o.appendChild(chuoi);
    return o;
  }

  /* ================================================================ bản đồ */

  async function moMon(id) {
    lamTrang();
    root.appendChild(el("div", "jl-tai", T("Đang mở màn…")));
    try {
      mon = await A.taiMon(id);
    } catch (e) {
      lamTrang();
      const l = el("div", "jl-tai", T("Không nạp được dữ liệu màn này."));
      l.appendChild(nut("jl-btn", T("Quay lại"), veChonMan));
      root.appendChild(l);
      return;
    }
    // Câu chuyện là file riêng (jlpt/truyen-<màn>.json); thiếu hoặc hỏng thì màn vẫn chơi được với lời thoại cũ.
    truyen = null;
    try { const t = await A.taiMon("truyen-" + id); if (t && t.chang) truyen = t; } catch (e) { truyen = null; }
    monId = id;
    CH.chuanBi(mon);
    chang = CH.chiaChang(mon);
    const o = TD.monCua(td, id);
    o.tong = chang.length;
    await luu();
    const lanDau = !o.thoai.batDau;
    veBanDo(true);                          // cuộn tới chặng hiện tại (N3: đáy bản đồ = chân núi)
    capNhatNhac();                          // vào màn là một cú bấm của người dùng nên được phép phát nhạc
    if (lanDau) {
      o.thoai.batDau = 1; await luu();
      thoai((truyen && truyen.batDau) || TH.MON[id].thoai.batDau, null, 0);
    }
  }

  /* ------------------------------------------------ cảnh nền liền mạch của bản đồ */

  /** Phần tử cuộn gần nhất bao quanh `e` (trang sổ tay / vùng cuộn của app). */
  function cuonCha(e) {
    for (let p = e.parentElement; p; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight + 1) return p;
    }
    return document.scrollingElement || document.documentElement;
  }

  /**
   * Sân khấu: 10 khung cảnh (9 chương + trùm cuối) chồng lên nhau, dính ở đầu vùng cuộn. Cuộn tới đâu thì khung của
   * chương đó hiện dần lên (mờ chồng mờ) — nên cảnh đổi liền mạch từ chân núi tới đỉnh / từ mặt biển tới đáy, không có
   * đường nối giữa các chương. Chỉ khung đang nhìn thấy mới được vẽ và chạy hoạt ảnh.
   */
  function taoGioi() {
    const g = el("div", "jl-gioi");
    const kh = el("div", "jl-gioi-khung");
    g.appendChild(kh);
    const lop = [];
    for (let k = 0; k < (CG ? CG.SO_KHUNG : 0); k++) {
      const l = el("div", "jl-gioi-lop an");
      l.style.zIndex = String(k);
      l.dataset.k = String(k);
      kh.appendChild(l); lop.push(l);
    }
    gioi = { goc: g, kh, lop, ve: lop.map(() => false), secs: [], leo: false, cuon: null, bo: null, cho: 0, u: -1 };
    return g;
  }

  /** Tính "độ cao" u (0…10) theo chỗ đang nhìn rồi chỉnh độ mờ của từng khung. */
  function capNhatGioi() {
    const g = gioi;
    if (!g || !g.secs.length || !g.cuon) return;
    const sp = g.cuon, doc = sp === document.scrollingElement || sp === document.documentElement;
    const vTop = doc ? 0 : sp.getBoundingClientRect().top, vCao = doc ? goc.innerHeight : sp.clientHeight;
    // Đường "ngắm" đi từ mép trên (đầu vùng cuộn) tới mép dưới (cuối vùng cuộn) nên khung đầu và khung cuối đều hiện đủ.
    const cuonMax = Math.max(0, sp.scrollHeight - sp.clientHeight);
    const yc = vTop + vCao * (cuonMax > 0 ? Math.max(0, Math.min(1, sp.scrollTop / cuonMax)) : 0.5);
    const trucLen = (y) => (g.leo ? -y : y);
    const ac = trucLen(yc);
    const khoang = g.secs.map((sec) => {
      const r = sec.getBoundingClientRect();
      return g.leo ? [-r.bottom, -r.top] : [r.top, r.bottom];
    });
    const K = khoang.length;
    let u;
    if (ac <= khoang[0][0]) u = 0;
    else if (ac >= khoang[K - 1][1]) u = K;
    else {
      u = K;
      for (let k = 0; k < K; k++) if (ac >= khoang[k][0] && ac <= khoang[k][1]) { u = k + (ac - khoang[k][0]) / Math.max(1, khoang[k][1] - khoang[k][0]); break; }
    }
    if (Math.abs(u - g.u) < 0.002) return;
    g.u = u;
    const op = g.lop.map((_, k) => (k === 0 ? 1 : Math.max(0, Math.min(1, (u - (k - 0.3)) / 0.6))));
    g.lop.forEach((l, k) => {
      const kinh = k < op.length - 1 && op[k + 1] >= 0.99;        // đã bị khung phía trên che kín
      const hien = op[k] > 0.01 && !kinh;
      if (hien && !g.ve[k]) { l.innerHTML = CG.ve(monId, k, g.ti); g.ve[k] = true; }
      else if (!hien && g.ve[k] && Math.abs(u - (k + 0.5)) > 2.2) { l.textContent = ""; g.ve[k] = false; }   // xa quá thì giải phóng bộ nhớ
      l.classList.toggle("an", !hien);
      if (hien) {
        l.style.opacity = op[k].toFixed(3);
        l.style.transform = "translate3d(0," + ((u - (k + 0.5)) * -2.4).toFixed(2) + "%,0)";
      }
    });
  }

  /** Bắt đầu theo dõi cuộn (gọi sau khi bản đồ đã nằm trong trang). */
  function batDauGioi(secs, leo) {
    const g = gioi;
    if (!g || !CG) return;
    g.secs = secs; g.leo = leo;
    g.cuon = cuonCha(root);
    const doc = g.cuon === document.scrollingElement || g.cuon === document.documentElement;
    const tren = doc ? goc : g.cuon;
    const dat = () => { g.ti = Math.max(0.4, Math.min(1.9, (g.kh.clientWidth || goc.innerWidth) / (g.kh.clientHeight || goc.innerHeight || 1))); };
    dat();
    const nhip = () => { if (!g.cho) g.cho = requestAnimationFrame(() => { g.cho = 0; capNhatGioi(); }); };
    const doiCo = () => {
      const moi = Math.round(g.ti * 100);
      dat();
      if (Math.round(g.ti * 100) !== moi) { g.ve = g.ve.map(() => false); g.lop.forEach((l) => { l.textContent = ""; }); g.u = -1; }
      // đổi giữa điện thoại và máy tính thì xếp lại cả bản đồ
      if (gioi === g && root.querySelector(".jl-bd") && root.querySelector(".jl-bd").classList.contains("rong") !== rong() && !chay) { veBanDo(false); return; }
      nhip();
    };
    tren.addEventListener("scroll", nhip, { passive: true });
    goc.addEventListener("resize", doiCo);
    g.bo = () => { tren.removeEventListener("scroll", nhip); goc.removeEventListener("resize", doiCo); if (g.cho) cancelAnimationFrame(g.cho); g.cho = 0; };
    capNhatGioi();
    setTimeout(capNhatGioi, 60);      // sau lần cuộn tự động tới chặng hiện tại
    setTimeout(capNhatGioi, 400);
  }

  function dungGioi() {
    if (gioi && gioi.bo) gioi.bo();
    gioi = null;
  }

  const LECH = [0, 14, 20, 14, 0, -14, -20, -14];     // độ lệch ngang (%) của chặng so với đường giữa
  const NHAN = { han: "漢", tu: "語", pp: "文" };

  function veBanDo(cuon) {
    const th = TH.MON[monId];
    lamTrang();
    const o = el("div", "jl-bd");
    o.style.setProperty("--m1", th.mau[0]); o.style.setProperty("--m2", th.mau[1]);
    const ids = chang.map((c) => c.id);
    const tt = TD.tomTat(td, monId, ids);

    const dau = el("div", "jl-bd-dau");
    dau.appendChild(nut("jl-lui", icon("arrow-left", 18), veChonMan));
    dau.lastChild.title = T("Quay lại");
    const gi = el("div", "jl-bd-gioi");
    gi.appendChild(el("div", "jl-bd-ten", th.emoji + " " + T(th.ten)));
    const bar = el("div", "jl-bar"); const f = el("i"); f.style.width = tt.tiLe + "%"; bar.appendChild(f);
    gi.appendChild(bar);
    gi.appendChild(el("div", "jl-bd-so", tt.xong + "/" + tt.tong + " " + T("chặng") + " · ★ " + tt.sao));
    dau.appendChild(gi);
    if (truyen) {
      const nk = nut("jl-lui jl-nk", "📖", moNhatKy);
      nk.title = T("Nhật ký câu chuyện"); nk.setAttribute("aria-label", nk.title);
      dau.appendChild(nk);
    }
    dau.appendChild(thongKe());
    o.appendChild(dau);
    o.appendChild(taoGioi());

    // bộ sưu tập: món đồ nhặt được ở mỗi chương đã qua trùm
    const sk = el("div", "jl-suutam");
    th.suuTam.forEach((e, ci) => {
      const co = TD.qua(TD.tot(td, monId, "c" + mon.chuong[ci].so + "boss"));
      const s = el("span", co ? "co" : "chua", co ? e : "·"); s.title = co ? e : T("Chưa nhặt được");
      sk.appendChild(s);
    });
    o.appendChild(sk);

    const hienTai = TD.changHienTai(td, monId, ids);
    let mucDem = 0;
    const nhom = [];
    mon.chuong.forEach((ch, ci) => nhom.push({ ci, ten: th.chuong[ci].ten, ds: chang.filter((c) => c.ci === ci), mau: th.chuong[ci].mau }));
    nhom.push({ ci: -1, ten: th.trum.ten, ds: chang.filter((c) => c.ci === -1), mau: th.trum.mau });

    const R = rong();
    o.classList.toggle("rong", R);
    o.classList.toggle("thu", !!td.thu);
    o.classList.toggle("leo-len", !!th.leoLen);       // màn leo núi: chương 1 ở DƯỚI cùng, cuộn lên để leo
    o.appendChild(khiQuyen(th));
    const trong = el("div", "jl-bd-trong");
    const secs = [];
    nhom.forEach((g, gi) => {
      const sec = el("section", "jl-chuong");
      sec.style.setProperty("--c1", g.mau[0]); sec.style.setProperty("--c2", g.mau[1]);
      sec.dataset.ci = String(g.ci);
      const xongCh = g.ds.filter((c) => TD.qua(TD.tot(td, monId, c.id))).length;
      // tấm bảng tên nổi (không còn banner tách rời): cảnh nền liền một mạch phía sau
      const bang = el("div", "jl-ten-chuong");
      bang.appendChild(el("span", null, g.ten));
      bang.appendChild(el("small", null, xongCh + "/" + g.ds.length));
      sec.appendChild(bang);

      // Điện thoại: một đường rắn đi dọc. Máy tính: đường rắn đi ngang theo hàng, đảo chiều mỗi hàng, tận dụng cả bề rộng.
      const COT = 6, DONG = 138;
      const nHang = Math.ceil(g.ds.length / COT);
      const cao = R ? nHang * DONG + 30 : g.ds.length * 92 + 20;
      const lo = el("div", "jl-lo" + (R ? " rong" : ""));
      lo.style.height = cao + "px";
      const toa = g.ds.map((c, k) => {
        let p;
        if (!R) p = { x: 50 + LECH[k % LECH.length], y: k * 92 + 46 };
        else {
          const hang = Math.floor(k / COT), vt = k % COT, cot = hang % 2 ? COT - 1 - vt : vt;
          p = { x: 9 + cot * (82 / (COT - 1)), y: hang * DONG + 66 + Math.round(Math.sin(k * 1.35) * 15) };
        }
        if (th.leoLen) p.y = cao - p.y;                 // leo lên: chặng đầu ở đáy khung
        return p;
      });
      let d = "";
      if (!R) toa.forEach((p, k) => { d += (k ? " L" : "M") + p.x.toFixed(1) + " " + p.y; });
      else toa.forEach((p, k) => {
        if (!k) { d = "M" + p.x.toFixed(1) + " " + p.y; return; }
        const p0 = toa[k - 2] || toa[k - 1], p1 = toa[k - 1], p3 = toa[k + 1] || p;
        d += " C" + (p1.x + (p.x - p0.x) / 6).toFixed(1) + " " + (p1.y + (p.y - p0.y) / 6).toFixed(1) + " " +
          (p.x - (p3.x - p1.x) / 6).toFixed(1) + " " + (p.y - (p3.y - p1.y) / 6).toFixed(1) + " " + p.x.toFixed(1) + " " + p.y;
      });
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "jl-duong"); svg.setAttribute("viewBox", "0 0 100 " + cao);
      svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d); path.setAttribute("fill", "none"); path.setAttribute("vector-effect", "non-scaling-stroke");
      svg.appendChild(path);
      lo.appendChild(svg);

      g.ds.forEach((c, k) => {
        const idx = chang.indexOf(c);
        const mo = TD.changMo(td, monId, ids, idx, true);
        const tot = TD.tot(td, monId, c.id);
        const xong = TD.qua(tot);
        const sao = ((td.mon[monId] || { chang: {} }).chang[c.id] || {}).sao || 0;
        const b = el("button", "jl-nut " + c.loai + (mo ? "" : " khoa") + (xong ? " xong" : "") + (idx === hienTai && mo ? " hien" : ""));
        b.type = "button"; b.dataset.id = c.id;
        b.style.left = toa[k].x + "%"; b.style.top = toa[k].y + "px";
        b.style.setProperty("--n", String(k));
        const mat = c.loai.indexOf("boss") === 0 ? icon(c.loai === "boss" ? "trophy" : "flag-banner", 28) : "<span>" + NHAN[c.loai] + "</span>";
        b.innerHTML = mat;
        b.setAttribute("aria-label", tenChang(c) + (mo ? "" : " (" + T("khoá") + ")"));
        if (!mo) b.appendChild(el("i", "jl-kho", "🔒"));
        const stars = el("div", "jl-sao");
        stars.textContent = xong ? "★".repeat(sao) + "☆".repeat(3 - sao) : "";
        b.appendChild(stars);
        if (idx === hienTai && mo) b.appendChild(el("div", "jl-co", T("Tiếp theo")));
        b.addEventListener("click", () => chamChang(c, idx, mo));
        lo.appendChild(b);
      });
      sec.appendChild(lo);
      secs[gi] = sec;
      trong.appendChild(sec);
      mucDem += g.ds.length;
    });
    o.appendChild(trong);
    root.appendChild(o);
    batDauGioi(secs, !!th.leoLen);
    if (cuon) {
      const hien = o.querySelector(".jl-nut.hien");
      if (hien) setTimeout(() => { try { hien.scrollIntoView({ block: "center" }); } catch (e) { /* trình duyệt cũ */ } }, 30);
    }
  }

  /** Đoạn truyện của một chặng ([] nếu màn chưa có truyện). */
  const doanTruyen = (c) => (truyen && truyen.chang && truyen.chang[c.id]) || [];
  const daKe = (c) => !!TD.monCua(td, monId).thoai["s" + c.id];

  /**
   * Bấm vào một chặng: nếu chặng đã mở và đoạn truyện của nó CHƯA được kể thì thú cưng hiện ra kể tiếp câu chuyện
   * ngay trong cảnh, kể xong mới mở tờ chặng. Chặng khoá thì không kể (khỏi lộ truyện); đã kể rồi thì vào thẳng.
   */
  /** Kể xong: cuộn về đúng chặng vừa bấm (banner đã co lại nên màn hình xê dịch) rồi mở tờ chặng. */
  function veLaiChang(c, idx, mo) {
    const n = root.querySelector('.jl-nut[data-id="' + c.id + '"]');
    if (n) { try { n.scrollIntoView({ block: "center", behavior: giamChuyen() ? "auto" : "smooth" }); } catch (e) { /* trình duyệt cũ */ } }
    moChang(c, idx, mo);
  }

  function chamChang(c, idx, mo) {
    const ds = doanTruyen(c);
    if (!mo || !ds.length || daKe(c)) { moChang(c, idx, mo); return; }
    TD.monCua(td, monId).thoai["s" + c.id] = 1;
    luu().then(() => thoai(ds, () => veLaiChang(c, idx, mo), c.ci));
  }

  /** Nhật ký truyện: mọi đoạn đã được kể, theo thứ tự câu chuyện, để đọc lại bất cứ lúc nào. */
  function moNhatKy() {
    const th = TH.MON[monId];
    const o = overlay("jl-to");
    const p = el("div", "jl-to-hop jl-nhatky");
    p.appendChild(el("div", "jl-to-ten", "📖 " + T("Nhật ký câu chuyện")));
    const ds = el("div", "jl-nk-ds");
    let n = 0, chuongCuoi = -2;
    const them = (lines, ci) => {
      if (ci !== chuongCuoi) {
        chuongCuoi = ci;
        ds.appendChild(el("div", "jl-nk-chuong", ci < 0 ? th.trum.ten : th.chuong[ci].ten));
      }
      lines.forEach((l) => { const r = el("div", "jl-nk-dong"); r.appendChild(el("span", "jl-nk-nv", th.nhanVat.emoji)); r.appendChild(el("span", null, l)); ds.appendChild(r); n++; });
    };
    if (truyen && TD.monCua(td, monId).thoai.batDau) them(truyen.batDau || [], 0);
    chang.forEach((c) => { if (daKe(c)) them(doanTruyen(c), c.ci); });
    if (!n) ds.appendChild(el("div", "jl-to-mo", T("Chưa có đoạn nào. Bấm vào một chặng để nghe nhân vật kể tiếp!")));
    p.appendChild(ds);
    p.appendChild(nut("jl-btn", T("Đóng"), () => o.remove()));
    o.appendChild(p);
  }

  function tenChang(c) {
    if (c.loai === "boss") return T("Trùm cuối");
    if (c.loai === "boss-chuong") return T("Trùm chương") + " " + c.chuong;
    const loai = c.loai === "han" ? T("Chữ Hán") : c.loai === "tu" ? T("Từ vựng") : T("Ngữ pháp");
    return T("Bài") + " " + c.bai + " · " + loai + (c.tongPhan > 1 ? " (" + c.phan + "/" + c.tongPhan + ")" : "");
  }

  /* ================================================================ tờ chặng */

  function overlay(cls) {
    const o = el("div", "jl-lop " + (cls || ""));
    o.addEventListener("click", (e) => { if (e.target === o && o.dataset.dong !== "khong") o.remove(); });
    root.appendChild(o);
    return o;
  }

  function moChang(c, idx, mo) {
    const o = overlay("jl-to");
    const p = el("div", "jl-to-hop");
    p.appendChild(el("div", "jl-to-ten", tenChang(c)));
    const tot = TD.tot(td, monId, c.id);
    const cc = ((td.mon[monId] || { chang: {} }).chang[c.id]) || null;
    let mota;
    if (c.loai === "boss") mota = T("Đề tổng hợp toàn màn, 30 câu. Đạt từ 60% để hoàn thành màn.");
    else if (c.loai === "boss-chuong") mota = T("Đề tổng hợp của cả chương, 20 câu. Đạt từ 60% để mở chương sau.");
    else mota = c.items.length + " " + (c.loai === "han" ? T("chữ Hán") : c.loai === "tu" ? T("từ vựng") : T("mẫu ngữ pháp")) + " · " + c.soCau + " " + T("câu hỏi") + " · " + T("đạt từ 60% để qua");
    p.appendChild(el("div", "jl-to-mo", mota));
    if (cc) p.appendChild(el("div", "jl-to-tot", T("Điểm cao nhất") + ": " + tot + "% " + "★".repeat(cc.sao || 0) + "☆".repeat(3 - (cc.sao || 0))));
    if (mo && doanTruyen(c).length && daKe(c)) {
      p.appendChild(nut("jl-btn jl-nghe-lai", "📖 " + T("Nghe lại câu chuyện"), () => { o.remove(); thoai(doanTruyen(c), () => veLaiChang(c, idx, mo), c.ci); }));
    }
    if (!mo) {
      p.appendChild(el("div", "jl-to-khoa", T("Chặng này đang khoá: hãy vượt chặng trước đó với từ 60% trở lên.")));
      p.appendChild(nut("jl-btn", T("Đóng"), () => o.remove()));
    } else {
      const hang = el("div", "jl-to-nut");
      hang.appendChild(nut("jl-btn chinh", T(c.loai.indexOf("boss") === 0 ? "Vào thi" : "Bắt đầu"), () => { o.remove(); batDau(c, true); }));
      if (c.loai.indexOf("boss") !== 0) hang.appendChild(nut("jl-btn", T("Làm bài ngay"), () => { o.remove(); batDau(c, false); }));
      p.appendChild(hang);
    }
    o.appendChild(p);
  }

  /* ================================================================ lời thoại */

  /**
   * Lời thoại của nhân vật NGAY TRONG cảnh nền (không phải hộp thoại nổi che màn hình): nhân vật nhảy vào đứng ở chân
   * cảnh, bong bóng nói hiện chữ dần; bấm "Tiếp" để nghe câu sau, hết thì nhân vật rời đi và việc đang chờ (`xong`)
   * được làm tiếp. Trong lúc nói, các chặng tạm thời không bấm được (tránh chạy chồng).
   * @param {string|string[]} dong  các câu thoại
   * @param {Function} [xong]       gọi khi nói xong
   */
  function thoai(dong, xong) {
    const th = TH.MON[monId];
    const ds = (Array.isArray(dong) ? dong.slice() : [dong]).filter(Boolean);
    const bd = root.querySelector(".jl-bd");
    if (!ds.length || !bd) { if (xong) xong(); return; }
    const sk = el("div", "jl-thoai");
    const nv = el("div", "jl-nv-canh");
    nv.innerHTML = TH.nhanVat(monId);
    nv.appendChild(el("div", "jl-nv-bong"));
    sk.appendChild(nv);
    sk.appendChild(el("div", "jl-nv-ten", th.nhanVat.ten));
    const bong = el("div", "jl-bong");
    const van = el("div", "jl-bong-chu");
    bong.appendChild(van);
    const bt = nut("jl-btn chinh", T("Tiếp"));
    bong.appendChild(bt);
    sk.appendChild(bong);
    root.appendChild(sk);
    bd.classList.add("dang-thoai");
    let i = 0, hen = 0;
    const hien = () => {
      clearTimeout(hen);
      van.textContent = ""; van.classList.remove("xong");
      Array.from(ds[i]).forEach((ch, k) => {
        const sp = el("span", null, ch);
        sp.style.animationDelay = (i ? 80 : 850) + Math.min(k * 24, 2600) + "ms";
        van.appendChild(sp);
      });
      // nhân vật mở/ngậm miệng trong lúc chữ còn đang hiện
      nv.classList.add("noi");
      hen = setTimeout(() => nv.classList.remove("noi"), (i ? 80 : 850) + Math.min(ds[i].length * 24, 2600) + 200);
      bt.textContent = i < ds.length - 1 ? T("Tiếp") : T("Đi thôi!");
    };
    bong.addEventListener("click", (e) => { if (e.target !== bt) { van.classList.add("xong"); nv.classList.remove("noi"); } });
    bt.addEventListener("click", () => {
      if (i < ds.length - 1) { i++; hien(); return; }
      clearTimeout(hen);
      sk.classList.add("di");
      bd.classList.remove("dang-thoai");
      setTimeout(() => sk.remove(), 320);
      if (xong) xong();
    });
    hien();
  }

  /* ================================================================ chơi */

  function batDau(c, coHoc) {
    const o = TD.monCua(td, monId);
    const xuLy = () => {
      chay = { c, hoc: coHoc ? CH.theHoc(mon, c) : [], iHoc: 0, lat: false, de: [], iQ: 0, dung: 0, sai: [], lai: [], tong: 0, da: false, laLai: false };
      if (chay.hoc.length) veHoc(); else vaoThu();
    };
    // Lời thoại đầu mỗi chương: chỉ lần đầu bước vào chương đó
    const kh = "c" + c.chuong;
    if (!truyen && c.chuong > 0 && c.loai !== "boss" && !o.thoai[kh] && TH.MON[monId].thoai.chuong[c.chuong]) {
      o.thoai[kh] = 1;
      luu().then(() => thoai(TH.MON[monId].thoai.chuong[c.chuong], xuLy, c.chuong - 1));
    } else xuLy();
  }

  function khungChay() {
    const o = el("div", "jl-chay");
    const th = TH.MON[monId];
    o.style.setProperty("--m1", th.mau[0]); o.style.setProperty("--m2", th.mau[1]);
    // Cảnh của chương đang chơi làm nền mờ dưới đáy màn hình; nội dung nằm trên.
    const nen = el("div", "jl-chay-canh");
    nen.innerHTML = CG ? CG.ve(monId, chay.c.ci < 0 ? 9 : chay.c.ci, (goc.innerWidth || 1000) / (goc.innerHeight || 700)) : TH.canh(monId, chay.c.ci, true);
    o.appendChild(nen);
    o.appendChild(khiQuyen(th, "chay"));
    root.appendChild(o);
    chay.o = o;
    gan(phim);
    return o;
  }

  /** Xoá phần nội dung của màn chơi nhưng giữ cảnh nền + lớp hạt (hai phần tử đầu). */
  function xoaNoiDung(o) {
    while (o.children.length > 2) o.removeChild(o.lastChild);
  }

  function dongChay() {
    if (chay && chay.o) chay.o.remove();
    chay = null;
    gan(null);
  }

  function gan(fn) {
    if (phimDang) document.removeEventListener("keydown", phimDang, true);
    phimDang = fn;
    if (fn) document.addEventListener("keydown", fn, true);
  }

  function hoiThoat() {
    if (!chay || chay.o.querySelector(".jl-hoi")) return;
    const h = el("div", "jl-hoi");
    const hop = el("div", "jl-hoi-hop");
    hop.appendChild(el("div", "jl-hoi-chu", T("Thoát lượt này? Tiến độ của lượt đang chơi sẽ không được lưu.")));
    const r = el("div", "jl-to-nut");
    r.appendChild(nut("jl-btn", T("Ở lại"), () => h.remove()));
    r.appendChild(nut("jl-btn chinh", T("Thoát"), () => { dongChay(); veBanDo(false); }));
    hop.appendChild(r); h.appendChild(hop);
    chay.o.appendChild(h);
  }

  function thanhTren(tien, tong) {
    const t = el("div", "jl-chay-tren");
    const x = nut("jl-x", icon("x", 20), hoiThoat); x.title = T("Thoát");
    t.appendChild(x);
    const bar = el("div", "jl-bar to"); const f = el("i"); f.style.width = (tong ? Math.round((tien / tong) * 100) : 0) + "%"; bar.appendChild(f);
    t.appendChild(bar);
    const ng = el("span", "jl-chip"); ng.innerHTML = icon("diamond", 16) + "<b>" + td.ngoc + "</b>";
    t.appendChild(ng);
    return t;
  }

  /* ----------------------------------------------------- phần học nhanh */

  /**
   * Sang thẻ kế (đã nhớ) hoặc cho thẻ này quay lại cuối hàng (chưa nhớ). Dùng chung cho vuốt, nút và phím,
   * để mọi đường đi đều ra cùng một kết quả.
   */
  function chamThe(nho) {
    const i = chay.iHoc, n = chay.hoc.length;
    chay.lat = false; chay.vuaLat = false;
    if (nho) {
      am(true);
      if (i < n - 1) { chay.iHoc++; veHoc(); } else vaoThu();
    } else {
      am(false);
      const t = chay.hoc.splice(i, 1)[0];
      chay.hoc.push(t);
      veHoc();
    }
  }
  /** Như `chamThe` nhưng cho thẻ bay đi trước (bấm nút / phím — khi vuốt thì thư viện đã tự cho bay). */
  function bayRoiCham(nho) {
    if (goc.TheVuot && chay && chay.theEl) goc.TheVuot.bay(chay.theEl, nho, 0);
    chamThe(nho);
  }
  function latThe() { chay.lat = !chay.lat; chay.vuaLat = true; veHoc(); }
  function luiThe() { if (chay.iHoc > 0) { chay.iHoc--; chay.lat = false; chay.vuaLat = false; veHoc(); } }

  function veHoc() {
    const c = chay.c;
    const o = chay.o || khungChay();
    xoaNoiDung(o);
    const n = chay.hoc.length, i = chay.iHoc;
    o.appendChild(thanhTren(i, n));
    o.appendChild(el("div", "jl-chay-tieu", T("Học nhanh") + " · " + tenChang(c)));

    const the = chay.hoc[i];
    const vuaLat = chay.vuaLat; chay.vuaLat = false;
    const card = el("div", "jl-the-hoc" + (chay.lat ? " lat" : "") + (vuaLat ? " lat-vao" : ""));
    card.tabIndex = 0;
    chay.theEl = card;
    const mat = el("div", "jl-the-mat");
    if (the.kieu === "tu") {
      mat.appendChild(el("div", "jl-lon", the.muc.w));
      mat.appendChild(el("div", "jl-nho-dong", the.muc.r));
      if (chay.lat) {
        mat.appendChild(el("div", "jl-nghia", the.muc.m));
        if (the.muc.hv) mat.appendChild(el("div", "jl-hv", T("Hán Việt") + ": " + the.muc.hv));
        if (the.vd) { mat.appendChild(el("div", "jl-vd", the.vd.j)); if (the.vd.v) mat.appendChild(el("div", "jl-vd-v", the.vd.v)); }
      }
      mat.appendChild(nut("jl-loa", icon("speaker-high", 20), (e) => { e.stopPropagation(); A.nghe(the.muc.r.replace(/[〜～]/g, "")); }));
    } else if (the.kieu === "han") {
      mat.appendChild(el("div", "jl-khung-han", the.muc.c));
      if (chay.lat) {
        if (the.muc.hv) mat.appendChild(el("div", "jl-nghia", the.muc.hv));
        // Nhiều cách đọc ngăn bằng " / " (đã chuẩn hoá ở chuanBi), mỗi loại một dòng cho dễ nhìn.
        const on = the.muc.on, kun = the.muc.kun;
        const dd = el("div", "jl-doc-khoi");
        const dong = (nhan, v) => {
          const r = el("div", "jl-doc");
          r.appendChild(el("b", "jl-doc-nhan", nhan));
          r.appendChild(document.createTextNode(v || "—"));
          return r;
        };
        dd.appendChild(dong("On", on)); dd.appendChild(dong("Kun", kun));
        mat.appendChild(dd);
        if (the.muc.nho) mat.appendChild(el("div", "jl-vd", the.muc.nho.replace(/^[\s|]+/, "")));
      }
    } else {
      mat.appendChild(el("div", "jl-lon pp", CH.tenPhap(the.muc.p)));
      if (chay.lat) {
        mat.appendChild(el("div", "jl-nghia", the.muc.m));
        if (the.muc.cn) mat.appendChild(el("div", "jl-doc", the.muc.cn));
        if (the.muc.gt) mat.appendChild(el("div", "jl-gt", the.muc.gt));
        if (the.vd) { mat.appendChild(el("div", "jl-vd", the.vd.j)); if (the.vd.v) mat.appendChild(el("div", "jl-vd-v", the.vd.v)); }
      }
    }
    if (!chay.lat) mat.appendChild(el("div", "jl-goi-y", T("Chạm để lật thẻ")));
    card.appendChild(mat);
    // Nhả chuột sau cú vuốt cũng sinh `click`: thư viện vuốt đã chặn (preventDefault), ta bỏ qua để thẻ không lật nhầm.
    card.addEventListener("click", (e) => { if (!e.defaultPrevented) latThe(); });
    o.appendChild(card);
    if (goc.TheVuot) {
      goc.TheVuot.gan(card, { duocKeo: () => true, chamXong: (nho) => chamThe(nho) });
      if (!vuaLat) goc.TheVuot.vao(card);
    }

    const dk = el("div", "jl-diem");
    dk.textContent = (i + 1) + " / " + n;
    o.appendChild(dk);

    const hang = el("div", "jl-chay-nut");
    hang.appendChild(nut("jl-btn", "‹ " + T("Trước"), luiThe));
    hang.appendChild(nut("jl-btn", "↺ " + T("Học lại"), () => bayRoiCham(false)));
    if (i < n - 1) hang.appendChild(nut("jl-btn chinh", T("Nhớ rồi") + " ›", () => bayRoiCham(true)));
    else hang.appendChild(nut("jl-btn chinh", T("Bắt đầu thử thách") + " →", () => bayRoiCham(true)));
    o.appendChild(hang);
    o.appendChild(el("div", "jl-meo", T("Vuốt thẻ sang phải = đã nhớ · sang trái = học lại · chạm để lật")));
    if (i < n - 1) o.appendChild(nut("jl-bo-qua", T("Bỏ qua phần học"), vaoThu));
  }

  /* ------------------------------------------------- phần thử thách */

  function vaoThu() {
    const c = chay.c;
    chay.de = CH.dungDe(mon, c, { baoLoi: td.baoLoi });
    chay.tong = chay.de.length;
    chay.iQ = 0; chay.dung = 0; chay.sai = []; chay.lai = []; chay.laLai = false;
    if (!chay.de.length) { A.toast(T("Chặng này chưa dựng được câu hỏi.")); dongChay(); veBanDo(false); return; }
    veCau();
  }

  function veCau() {
    const o = chay.o || khungChay();
    xoaNoiDung(o);
    if ((chay.combo || 0) >= 3) o.appendChild(el("div", "jl-combo", "🔥 ×" + chay.combo));
    const q = chay.de[chay.iQ];
    chay.da = false; chay.chon = -1;
    const n = chay.tong;
    const soDaLam = chay.laLai ? n : Math.min(chay.iQ, n);
    o.appendChild(thanhTren(soDaLam, n));
    o.appendChild(el("div", "jl-chay-tieu", chay.laLai ? T("Ôn lại câu sai") : (Math.min(chay.iQ + 1, n)) + " / " + n));

    const de = el("div", "jl-de");
    de.appendChild(el("div", "jl-lenh", T(q.de.lenh)));
    if (q.kieu === "nghe") {
      de.appendChild(nut("jl-loa to", icon("speaker-high", 40), () => A.nghe(q.de.nghe)));
    } else if (q.de.truoc != null) {
      const cau = el("div", "jl-cau");
      cau.appendChild(document.createTextNode(q.de.truoc));
      cau.appendChild(el("span", "jl-trong", "＿＿＿"));
      cau.appendChild(document.createTextNode(q.de.sau));
      de.appendChild(cau);
      if (q.de.dich) de.appendChild(el("div", "jl-vd-v", q.de.dich));
    } else {
      de.appendChild(el("div", "jl-lon" + (q.kieu === "nghia-tu" || q.kieu === "hv-han" ? " vi" : ""), q.de.chinh));
      if (q.de.phu) de.appendChild(el("div", "jl-nho-dong", q.de.phu));
      if (q.de.nghe && q.kieu === "tu-nghia") de.appendChild(nut("jl-loa", icon("speaker-high", 20), () => A.nghe(q.de.nghe)));
    }
    o.appendChild(de);

    const lc = el("div", "jl-lc");
    q.chon.forEach((t, k) => {
      const b = nut("jl-lua", null, () => chon(k));
      b.dataset.k = String(k);
      b.style.setProperty("--i", String(k));
      b.appendChild(el("span", "jl-so", String(k + 1)));
      b.appendChild(el("span", "jl-lua-chu", t));
      lc.appendChild(b);
    });
    o.appendChild(lc);
    const fb = el("div", "jl-fb"); fb.hidden = true;
    o.appendChild(fb);
    chay.fb = fb;
    if (q.kieu === "nghe") setTimeout(() => { if (chay && chay.de[chay.iQ] === q && !chay.da) A.nghe(q.de.nghe); }, 280);
  }

  function chon(k) {
    if (!chay || chay.da) return;
    const q = chay.de[chay.iQ];
    chay.da = true; chay.chon = k;
    const dung = k === q.dung;
    const nutLua = chay.o.querySelectorAll(".jl-lua");
    nutLua.forEach((b, i) => {
      b.disabled = true;
      if (i === q.dung) b.classList.add("dung");
      else if (i === k) b.classList.add("sai");
    });
    if (!chay.laLai) {
      if (dung) chay.dung++;
      else { chay.sai.push(q.mucId); chay.lai.push(q); }
    }
    const fb = chay.fb;
    fb.hidden = false;
    fb.className = "jl-fb " + (dung ? "dung" : "sai");
    fb.textContent = "";
    const th = TH.MON[monId];
    chay.combo = dung ? (chay.combo || 0) + 1 : 0;
    am(dung);
    if (!dung) rung(60);
    // Hiệu ứng: viền màn hình loé, ngọc bay lên, đề rung khi sai, ngọn lửa khi đúng liên tiếp.
    chay.o.classList.remove("loe-dung", "loe-sai"); void chay.o.offsetWidth;
    chay.o.classList.add(dung ? "loe-dung" : "loe-sai");
    const nutDung = nutLua[k];
    if (dung && nutDung) {
      const b = el("span", "jl-bay", "+1 💎");
      nutDung.appendChild(b);
      setTimeout(() => b.remove(), 1000);
    }
    if (dung && chay.combo >= 3) {
      let cb = chay.o.querySelector(".jl-combo");
      if (!cb) { cb = el("div", "jl-combo"); chay.o.appendChild(cb); }
      cb.textContent = "🔥 ×" + chay.combo;
      cb.classList.remove("no"); void cb.offsetWidth; cb.classList.add("no");
    } else if (!dung) { const cb = chay.o.querySelector(".jl-combo"); if (cb) cb.remove(); }
    const KHEN = ["Chính xác!", "Tuyệt vời!", "Quá đỉnh!", "Giỏi lắm!", "Chuẩn rồi!"];
    const tieu = dung ? T(KHEN[Math.floor(Math.random() * KHEN.length)]) : T("Chưa đúng");
    fb.appendChild(el("div", "jl-fb-tieude", th.nhanVat.emoji + " " + tieu + (dung && chay.combo >= 3 ? "  🔥×" + chay.combo : "")));
    fb.appendChild(el("div", "jl-fb-dap", giaiThich(q)));
    const hang = el("div", "jl-fb-nut");
    hang.appendChild(nut("jl-bao", "🚩 " + T("Báo câu sai"), async () => {
      td.baoLoi[q.id] = Date.now(); await luu(); A.toast(T("Đã ghi nhận. Câu này sẽ không xuất hiện lại.")); hang.querySelector(".jl-bao").disabled = true;
    }));
    hang.appendChild(nut("jl-btn chinh", T("Tiếp tục"), tiep));
    fb.appendChild(hang);
    if (A.nghe && (q.kieu === "tu-doc" || q.kieu === "tu-nghia") && dung) { /* không đọc lại: đã đọc ở đề */ }
  }

  function giaiThich(q) {
    const d = q.dapAn || {};
    if (q.kieu === "han-hv" || q.kieu === "han-on" || q.kieu === "hv-han") return d.c + "  ·  " + (d.hv || "—") + "  ·  On: " + (d.on || "—") + "  ·  Kun: " + (d.kun && d.kun !== "---" ? d.kun : "—");
    if (q.kieu.indexOf("pp-") === 0) return (d.p || "") + " = " + (d.m || "") + (d.cau ? "\n" + d.cau + (d.dich ? "\n" + d.dich : "") : "");
    return (d.w || "") + (d.r && d.r !== d.w ? "（" + d.r + "）" : "") + " = " + (d.m || "") + (d.cau ? "\n" + d.cau + (d.dich ? "\n" + d.dich : "") : "");
  }

  function tiep() {
    if (!chay || !chay.da) return;
    if (chay.iQ < chay.de.length - 1) { chay.iQ++; veCau(); return; }
    if (!chay.laLai && chay.lai.length) {
      // Làm lại những câu sai MỘT lần để nhớ — không tính vào điểm.
      chay.de = chay.lai.slice(); chay.iQ = 0; chay.laLai = true; veCau(); return;
    }
    ketQua();
  }

  /* ------------------------------------------------------ kết quả */

  async function ketQua() {
    const c = chay.c;
    const truoc = TD.tot(td, monId, c.id);
    const kq = TD.ghiKetQua(td, monId, c.id, { dung: chay.dung, tong: chay.tong, saiIds: chay.sai }, Date.now());
    await luu();
    const lanDauQua = kq.qua && truoc < TD.NGUONG;
    const o = chay.o;
    xoaNoiDung(o);
    o.classList.add("ket-qua"); o.classList.remove("loe-dung", "loe-sai");
    const hop = el("div", "jl-kq");
    const vong = el("div", "jl-vong " + (kq.qua ? "dat" : "truot"));
    vong.style.setProperty("--p", kq.phanTram);
    const so = el("b", null, kq.phanTram + "%");
    vong.appendChild(so);
    hop.appendChild(vong);
    dem(so, kq.phanTram, 1100, (n) => n + "%");
    const sk = el("div", "jl-kq-sao");
    if (kq.qua) for (let k = 0; k < 3; k++) {
      const st = el("span", "jl-st" + (k < kq.sao ? " co" : ""), k < kq.sao ? "★" : "☆");
      st.style.animationDelay = (0.9 + k * 0.28) + "s";
      sk.appendChild(st);
    }
    hop.appendChild(sk);
    hop.appendChild(el("div", "jl-kq-tieu", kq.qua ? (c.loai === "boss" ? T("Hoàn thành màn!") : T("Vượt chặng!")) : T("Chưa đạt 60%")));
    const phu = el("div", "jl-kq-phu");
    const ng = el("span", "jl-kq-ngoc", "+0 💎");
    phu.appendChild(document.createTextNode(chay.dung + " / " + chay.tong + " " + T("câu đúng") + " · "));
    phu.appendChild(ng);
    if (!kq.qua) phu.appendChild(document.createTextNode(" · " + T("Ôn lại rồi thử lần nữa nhé, cần từ 60% để đi tiếp.")));
    hop.appendChild(phu);
    dem(ng, kq.ngoc, 1200, (n) => "+" + n + " 💎");
    if (kq.laKyLuc && kq.qua && truoc > 0) hop.appendChild(el("div", "jl-kyluc", "🏆 " + T("Kỷ lục mới!")));
    if (kq.qua) { am(true); setTimeout(() => { if (chay && chay.o === o) phaoGiay(o, c.loai === "boss"); }, 350); }
    if (chay.sai.length) {
      const sai = el("details", "jl-sai");
      sai.appendChild(el("summary", null, T("Các câu sai") + " (" + chay.lai.length + ")"));
      chay.lai.forEach((q) => sai.appendChild(el("div", "jl-sai-dong", giaiThich(q))));
      hop.appendChild(sai);
    }
    const hang = el("div", "jl-chay-nut");
    hang.appendChild(nut("jl-btn", T("Chơi lại"), () => { const cc = chay.c; dongChay(); batDau(cc, false); }));
    hang.appendChild(nut("jl-btn chinh", T("Tiếp tục"), async () => {
      const cc = chay.c; dongChay();
      veBanDo(true);
      await sauChang(cc, kq, lanDauQua);
    }));
    hop.appendChild(hang);
    o.appendChild(hop);
  }

  /** Câu chuyện sau chặng: nhặt đồ khi qua trùm chương, kết thúc khi qua trùm cuối. */
  async function sauChang(c, kq, lanDauQua) {
    const th = TH.MON[monId];
    if (!lanDauQua) return;
    if (c.loai === "boss-chuong") {
      thoai((truyen && truyen.xongChuong && truyen.xongChuong[c.chuong]) || th.thoai.xongChuong[c.chuong] || "", null, c.chuong - 1);
    } else if (c.loai === "boss") {
      thoai((truyen && truyen.thang) || th.thoai.thang, null, -1);
    }
  }

  /* -------------------------------------------------------- phím tắt */

  function phim(e) {
    if (!chay) return;
    const t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (chay.o.querySelector(".jl-hoi")) { if (e.key === "Escape") { e.preventDefault(); chay.o.querySelector(".jl-hoi").remove(); } return; }
    const k = e.key;
    if (k === "Escape") { e.preventDefault(); e.stopPropagation(); hoiThoat(); return; }
    const dangHoc = chay.de.length === 0;
    if (dangHoc) {
      if (k === "ArrowRight" || k === "Enter") { e.preventDefault(); e.stopPropagation(); bayRoiCham(true); }
      else if (k === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); luiThe(); }
      else if (k === "ArrowDown") { e.preventDefault(); e.stopPropagation(); bayRoiCham(false); }
      else if (k === " ") { e.preventDefault(); e.stopPropagation(); latThe(); }
      return;
    }
    if (chay.o.classList.contains("ket-qua")) return;
    if (/^[1-4]$/.test(k) && !chay.da) { e.preventDefault(); e.stopPropagation(); chon(Number(k) - 1); return; }
    if ((k === "Enter" || k === " ") && chay.da) { e.preventDefault(); e.stopPropagation(); tiep(); }
  }

  /* -------------------------------------------- tiện cho kiểm thử */

  /** Nút Quay lại của Android: đóng lớp trên cùng; trả true nếu đã xử lý. */
  function quayLai() {
    if (!root) return false;
    const h = root.querySelector(".jl-hoi");
    if (h) { h.remove(); return true; }
    if (chay) { hoiThoat(); return true; }
    const t = root.querySelector(".jl-thoai .jl-btn");
    if (t) { t.click(); return true; }
    const l = root.querySelector(".jl-lop");
    if (l) { l.remove(); return true; }
    if (monId) { veChonMan(); return true; }
    return false;
  }

  goc.JlptUI = {
    khoi, lamMoi, moMon, quayLai,
    /** Rời khỏi chế độ (đổi tab): dừng nhạc nền. Quay lại thì `lamMoi` bật tiếp. */
    tamDung() { if (NH) NH.tat(); try { if (A && A.toanMan) A.toanMan(false); } catch (e) { /* tuỳ chọn */ } },
    /** Dùng trong test: chỉ số lựa chọn đúng của câu đang hiện. */
    dapAnDung() { return chay && chay.de[chay.iQ] ? chay.de[chay.iQ].dung : -1; },
    trangThai() { return { monId, soChang: chang.length, chay: !!chay, td }; }
  };
})(typeof self !== "undefined" ? self : this);
