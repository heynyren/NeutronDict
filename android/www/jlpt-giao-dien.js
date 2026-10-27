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

  const TD = goc.JlptTienDo, CH = goc.JlptCauHoi, TH = goc.JlptTheme;

  let A = null;            // bộ nối với app
  let root = null;         // phần tử chứa cả chế độ
  let td = null;           // tiến độ đang dùng
  let mon = null;          // dữ liệu màn đang mở
  let monId = null;
  let chang = [];          // danh sách chặng của màn đang mở
  let chay = null;         // lượt chơi đang diễn ra
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

  /* ================================================================ khởi động */

  /**
   * @param {Element} r  phần tử chứa
   * @param {object} adapter
   *   doc():Promise<object|null>, ghi(obj):Promise, taiMon(id):Promise<object>,
   *   nghe(text), T(s), icon(ten,co), toast(s)
   */
  async function khoi(r, adapter) {
    A = adapter; root = r;
    root.classList.add("jl-goc");
    td = TD.chuan(await A.doc());
    veChonMan();
  }

  /** Gọi mỗi lần người dùng mở màn này (dữ liệu có thể vừa được đồng bộ từ máy khác). */
  async function lamMoi() {
    if (!A) return;
    if (chay) return;                       // đang chơi dở thì đừng đè
    td = TD.chuan(await A.doc());
    if (monId && mon) veBanDo(false); else veChonMan();
  }

  /* ================================================================ chọn màn */

  const TRUM = { n3: "boss", n2: "boss" };    // màn có dữ liệu → id trùm cuối

  function veChonMan() {
    monId = null; mon = null; chang = [];
    root.textContent = "";
    const o = el("div", "jl-chon");
    const dau = el("div", "jl-dau");
    const t = el("div", "jl-dau-chu");
    t.appendChild(el("div", "jl-tieude", T("Ôn thi JLPT")));
    t.appendChild(el("div", "jl-phu", T("Mỗi cấp là một màn chơi. Vượt từng chặng, đạt từ 60% để đi tiếp.")));
    dau.appendChild(t);
    dau.appendChild(thongKe());
    o.appendChild(dau);

    const ds = el("div", "jl-the-ds");
    Object.keys(TH.MON).sort((a, b) => TD.THU_TU_MON.indexOf(a) - TD.THU_TU_MON.indexOf(b)).forEach((id) => {
      const th = TH.MON[id];
      const mo = TD.monMo(td, id, TRUM);
      const m = td.mon[id] || { chang: {} };
      const tong = m.tong || 0;
      const xong = Object.keys(m.chang).filter((k) => TD.qua(m.chang[k].tot || 0)).length;
      const b = el("button", "jl-the" + (mo ? "" : " khoa"));
      b.type = "button";
      b.style.setProperty("--m1", th.mau[0]); b.style.setProperty("--m2", th.mau[1]);
      b.dataset.mon = id;
      const e1 = el("div", "jl-the-emoji", th.emoji);
      const e2 = el("div", "jl-the-thong");
      e2.appendChild(el("div", "jl-the-cap", th.cap));
      e2.appendChild(el("div", "jl-the-ten", T(th.ten)));
      e2.appendChild(el("div", "jl-the-mo", mo ? T(th.phu) : T("Hoàn thành màn trước (trùm cuối ≥ 60%) để mở màn này.")));
      if (mo) {
        const bar = el("div", "jl-bar"); const f = el("i"); f.style.width = (tong ? Math.round((xong / tong) * 100) : 0) + "%"; bar.appendChild(f);
        e2.appendChild(bar);
        e2.appendChild(el("div", "jl-the-so", tong ? xong + "/" + tong + " " + T("chặng") : T("Chưa chơi")));
      }
      b.appendChild(e1); b.appendChild(e2);
      if (!mo) b.appendChild(el("div", "jl-khoa", "🔒"));
      b.addEventListener("click", () => {
        if (!mo) { A.toast(T("Hoàn thành trùm cuối màn trước (≥ 60%) để mở màn này.")); return; }
        moMon(id);
      });
      ds.appendChild(b);
    });
    TH.SAP_CO.forEach((s) => {
      const b = el("div", "jl-the sap");
      b.appendChild(el("div", "jl-the-emoji", s.emoji));
      const e2 = el("div", "jl-the-thong");
      e2.appendChild(el("div", "jl-the-cap", s.cap));
      e2.appendChild(el("div", "jl-the-ten", T(s.ten)));
      e2.appendChild(el("div", "jl-the-mo", T("Sắp có — thêm khi có dữ liệu giáo trình.")));
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
    root.textContent = "";
    root.appendChild(el("div", "jl-tai", T("Đang mở màn…")));
    try {
      mon = await A.taiMon(id);
    } catch (e) {
      root.textContent = "";
      const l = el("div", "jl-tai", T("Không nạp được dữ liệu màn này."));
      l.appendChild(nut("jl-btn", T("Quay lại"), veChonMan));
      root.appendChild(l);
      return;
    }
    monId = id;
    CH.chuanBi(mon);
    chang = CH.chiaChang(mon);
    const o = TD.monCua(td, id);
    o.tong = chang.length;
    await luu();
    veBanDo(true);
    if (!o.thoai.batDau) {
      o.thoai.batDau = 1; await luu();
      thoai(TH.MON[id].thoai.batDau);
    }
  }

  const LECH = [0, 14, 20, 14, 0, -14, -20, -14];     // độ lệch ngang (%) của chặng so với đường giữa
  const NHAN = { han: "漢", tu: "語", pp: "文" };

  function veBanDo(cuon) {
    const th = TH.MON[monId];
    root.textContent = "";
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
    dau.appendChild(thongKe());
    o.appendChild(dau);

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

    nhom.forEach((g) => {
      const sec = el("section", "jl-chuong");
      sec.style.setProperty("--c1", g.mau[0]); sec.style.setProperty("--c2", g.mau[1]);
      const ban = el("div", "jl-banner");
      ban.innerHTML = TH.canh(monId, g.ci);
      const tx = el("div", "jl-banner-chu");
      const xongCh = g.ds.filter((c) => TD.qua(TD.tot(td, monId, c.id))).length;
      tx.appendChild(el("div", "jl-banner-ten", g.ten));
      tx.appendChild(el("div", "jl-banner-so", xongCh + "/" + g.ds.length));
      ban.appendChild(tx);
      sec.appendChild(ban);

      const lo = el("div", "jl-lo");
      lo.style.height = (g.ds.length * 92 + 20) + "px";
      let d = "";
      const toa = g.ds.map((c, k) => ({ x: 50 + LECH[k % LECH.length], y: k * 92 + 46 }));
      toa.forEach((p, k) => { d += (k ? " L" : "M") + p.x.toFixed(1) + " " + p.y; });
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "jl-duong"); svg.setAttribute("viewBox", "0 0 100 " + (g.ds.length * 92 + 20));
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
        const mat = c.loai.indexOf("boss") === 0 ? icon(c.loai === "boss" ? "trophy" : "flag-banner", 28) : "<span>" + NHAN[c.loai] + "</span>";
        b.innerHTML = mat;
        b.setAttribute("aria-label", tenChang(c) + (mo ? "" : " (" + T("khoá") + ")"));
        if (!mo) b.appendChild(el("i", "jl-kho", "🔒"));
        const stars = el("div", "jl-sao");
        stars.textContent = xong ? "★".repeat(sao) + "☆".repeat(3 - sao) : "";
        b.appendChild(stars);
        b.addEventListener("click", () => moChang(c, idx, mo));
        lo.appendChild(b);
      });
      sec.appendChild(lo);
      o.appendChild(sec);
      mucDem += g.ds.length;
    });
    root.appendChild(o);
    if (cuon) {
      const hien = o.querySelector(".jl-nut.hien");
      if (hien) setTimeout(() => { try { hien.scrollIntoView({ block: "center" }); } catch (e) { /* trình duyệt cũ */ } }, 30);
    }
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

  function thoai(dong, xong) {
    const th = TH.MON[monId];
    const ds = Array.isArray(dong) ? dong.slice() : [dong];
    const o = overlay("jl-thoai");
    o.dataset.dong = "khong";
    const hop = el("div", "jl-thoai-hop");
    hop.appendChild(el("div", "jl-nv", th.nhanVat.emoji));
    const bong = el("div", "jl-bong");
    const van = el("div", "jl-bong-chu");
    bong.appendChild(van);
    const ten = el("div", "jl-nv-ten", th.nhanVat.ten);
    hop.appendChild(ten); hop.appendChild(bong);
    const bt = nut("jl-btn chinh", T("Tiếp"));
    hop.appendChild(bt);
    o.appendChild(hop);
    let i = 0;
    const hien = () => { van.textContent = ds[i]; bt.textContent = i < ds.length - 1 ? T("Tiếp") : T("Đi thôi!"); };
    bt.addEventListener("click", () => { if (i < ds.length - 1) { i++; hien(); } else { o.remove(); if (xong) xong(); } });
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
    if (c.chuong > 0 && c.loai !== "boss" && !o.thoai[kh] && TH.MON[monId].thoai.chuong[c.chuong]) {
      o.thoai[kh] = 1;
      luu().then(() => thoai(TH.MON[monId].thoai.chuong[c.chuong], xuLy));
    } else xuLy();
  }

  function khungChay() {
    const o = el("div", "jl-chay");
    const th = TH.MON[monId];
    o.style.setProperty("--m1", th.mau[0]); o.style.setProperty("--m2", th.mau[1]);
    root.appendChild(o);
    chay.o = o;
    gan(phim);
    return o;
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

  function veHoc() {
    const c = chay.c;
    const o = chay.o || khungChay();
    o.textContent = "";
    const n = chay.hoc.length, i = chay.iHoc;
    o.appendChild(thanhTren(i, n));
    o.appendChild(el("div", "jl-chay-tieu", T("Học nhanh") + " · " + tenChang(c)));

    const the = chay.hoc[i];
    const card = el("div", "jl-the-hoc" + (chay.lat ? " lat" : ""));
    card.tabIndex = 0;
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
        mat.appendChild(el("div", "jl-doc", "On: " + (the.muc.on || "—") + "  ·  Kun: " + (the.muc.kun && the.muc.kun !== "---" ? the.muc.kun : "—")));
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
    card.addEventListener("click", () => { chay.lat = !chay.lat; veHoc(); });
    o.appendChild(card);

    const dk = el("div", "jl-diem");
    dk.textContent = (i + 1) + " / " + n;
    o.appendChild(dk);

    const hang = el("div", "jl-chay-nut");
    hang.appendChild(nut("jl-btn", "‹ " + T("Trước"), () => { if (chay.iHoc > 0) { chay.iHoc--; chay.lat = false; veHoc(); } }));
    if (i < n - 1) hang.appendChild(nut("jl-btn chinh", T("Tiếp") + " ›", () => { chay.iHoc++; chay.lat = false; veHoc(); }));
    else hang.appendChild(nut("jl-btn chinh", T("Bắt đầu thử thách") + " →", vaoThu));
    o.appendChild(hang);
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
    o.textContent = "";
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
    o.textContent = "";
    o.classList.add("ket-qua");
    const hop = el("div", "jl-kq");
    const vong = el("div", "jl-vong " + (kq.qua ? "dat" : "truot"));
    vong.style.setProperty("--p", kq.phanTram);
    vong.appendChild(el("b", null, kq.phanTram + "%"));
    hop.appendChild(vong);
    hop.appendChild(el("div", "jl-kq-sao", kq.qua ? "★".repeat(kq.sao) + "☆".repeat(3 - kq.sao) : ""));
    hop.appendChild(el("div", "jl-kq-tieu", kq.qua ? (c.loai === "boss" ? T("Hoàn thành màn!") : T("Vượt chặng!")) : T("Chưa đạt 60%")));
    hop.appendChild(el("div", "jl-kq-phu", chay.dung + " / " + chay.tong + " " + T("câu đúng") + " · +" + kq.ngoc + " 💎"
      + (kq.qua ? "" : " · " + T("Ôn lại rồi thử lần nữa nhé, cần từ 60% để đi tiếp."))));
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
      thoai(th.thoai.xongChuong[c.chuong] || "");
    } else if (c.loai === "boss") {
      const sau = TD.THU_TU_MON[TD.THU_TU_MON.indexOf(monId) + 1];
      const them = TH.MON[sau] ? [T("Màn") + " " + TH.MON[sau].cap + " " + T("đã mở!")] : [];
      thoai(th.thoai.thang.concat(them));
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
      if (k === "ArrowRight" || k === "Enter") { e.preventDefault(); e.stopPropagation(); if (chay.iHoc < chay.hoc.length - 1) { chay.iHoc++; chay.lat = false; veHoc(); } else vaoThu(); }
      else if (k === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); if (chay.iHoc > 0) { chay.iHoc--; chay.lat = false; veHoc(); } }
      else if (k === " ") { e.preventDefault(); e.stopPropagation(); chay.lat = !chay.lat; veHoc(); }
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
    /** Dùng trong test: chỉ số lựa chọn đúng của câu đang hiện. */
    dapAnDung() { return chay && chay.de[chay.iQ] ? chay.de[chay.iQ].dung : -1; },
    trangThai() { return { monId, soChang: chang.length, chay: !!chay, td }; }
  };
})(typeof self !== "undefined" ? self : this);
