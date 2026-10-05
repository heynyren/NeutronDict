/**
 * Màn luyện ngữ pháp dùng chung cho extension và Android.
 * Lịch theo câu được lưu qua các hàm do nền tảng cung cấp; không chấm từ vựng.
 */
(function (goc) {
  "use strict";

  let layMuc = null, ngonNgu = null, dichCau = null, tatCa = [], buoi = null, daGan = false;
  let docLich = null, ghiKetQua = null, kho = {}, dangGhi = false;
  const $ = (id) => document.getElementById(id);

  function thongBao(chu, loai) {
    const o = $("npFeedback");
    o.textContent = chu || "";
    o.className = "np-feedback" + (loai ? " " + loai : "");
  }

  const biBang = (q) => goc.NguPhapSrs.biDongBang(kho[goc.NguPhapSrs.khoa(q.cau)]);
  const conLai = () => tatCa.filter((q) => !biBang(q));

  function veThongKe() {
    const t = goc.NguPhapSrs.thongKe(tatCa, kho);
    let chu = T2("{m} câu mới · {d} câu đến hạn · {t} câu tổng cộng", { m:t.moi, d:t.den, t:t.tong });
    if (t.bang) chu += " · " + T2("{b} câu đã đóng băng", { b: t.bang });
    $("npStats").textContent = chu;
  }

  /**
   * Danh sách câu đã đóng băng, mỗi câu một nút "Mở lại".
   *
   * Câu làm đúng bị đóng băng ngay nên danh sách này sẽ lớn dần; để trong một
   * khối thu gọn (<details>) cho nó không chiếm màn luyện. Chỉ vẽ lại khi mở ra
   * hoặc khi số câu đổi — vẽ cả trăm hàng mỗi lần bấm một mảnh là phí.
   */
  let bangDaVe = "";
  function veBang() {
    const hop = $("npBang");
    if (!hop) return;
    const ds = ghiKetQua ? tatCa.filter(biBang) : [];
    hop.hidden = !ds.length;
    if (!ds.length) { bangDaVe = ""; $("npBangDs").textContent = ""; return; }
    $("npBangTen").textContent = T2("Câu đã đóng băng ({n})", { n: ds.length });
    const dau = ds.map((q) => q.cau).join("\n") + "|" + dangGhi;
    if (dau === bangDaVe) return;
    bangDaVe = dau;
    const khung = $("npBangDs");
    khung.textContent = "";
    for (const q of ds) {
      const hang = document.createElement("div");
      hang.className = "np-bang-hang";
      const chu = document.createElement("span");
      chu.className = "np-bang-cau"; chu.textContent = q.cau;
      const nut = document.createElement("button");
      nut.type = "button"; nut.className = "btn sm"; nut.textContent = T("Mở lại");
      nut.disabled = dangGhi;
      nut.addEventListener("click", () => moLai(q, nut));
      hang.appendChild(chu); hang.appendChild(nut);
      khung.appendChild(hang);
    }
  }

  async function moLai(q, nut) {
    if (dangGhi) return;
    dangGhi = true; nut.disabled = true;
    try {
      const r = await ghiKetQua(q, "mo", true);
      if (r) kho[goc.NguPhapSrs.khoa(q.cau)] = r;
      else thongBao(T("Chưa mở lại được câu này. Hãy thử lại."), "sai");
    } catch (e) { thongBao(T("Chưa mở lại được câu này. Hãy thử lại."), "sai"); }
    finally { dangGhi = false; ve(); }
  }

  function ve() {
    const nutBat = $("npStart"), bai = $("npExercise"), dem = $("npCount");
    if (ghiKetQua && $("npStats")) veThongKe();
    veBang();
    const due = $("npDue");
    if (due) { due.hidden = !ghiKetQua || !tatCa.length || !!(buoi && buoi.i < buoi.ds.length);
      due.disabled = dangGhi || !tatCa.some(q => goc.NguPhapSrs.denHan(kho[goc.NguPhapSrs.khoa(q.cau)])); }
    if ($("npSchedule")) $("npSchedule").hidden = !buoi;
    if (!buoi || buoi.i >= buoi.ds.length) {
      bai.hidden = true;
      nutBat.hidden = !tatCa.length;
      nutBat.disabled = !conLai().length;
      nutBat.textContent = ghiKetQua ? T("Luyện tất cả") : (buoi ? T("Luyện lại") : T("Bắt đầu luyện"));
      if (buoi) dem.textContent = T2("Đã ghép đúng {dung}/{tong} câu.", {
        dung: buoi.dung, tong: buoi.ds.length
      });
      return;
    }
    nutBat.hidden = true;
    bai.hidden = false;
    const q = buoi.ds[buoi.i];
    $("npProgress").textContent = T2("Câu {i}/{n} · {m} mảnh", {
      i: buoi.i + 1, n: buoi.ds.length, m: q.manh.length
    });
    $("npHint").textContent = q.tu !== q.cau
      ? T2("Từ đã lưu: {tu}", { tu: q.tu })
      : T("Ghép lại câu đã lưu");
    const daChon = buoi.chon;
    const oDap = $("npAnswer"), oNguon = $("npOptions");
    oDap.textContent = "";
    oNguon.textContent = "";
    if (!daChon.length) {
      const goi = document.createElement("span");
      goi.className = "np-placeholder";
      goi.textContent = T("Chạm các mảnh bên dưới theo đúng thứ tự");
      oDap.appendChild(goi);
    }
    function nutMảnh(p, noi, bam) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "np-piece";
      b.textContent = p.text.trim();
      b.disabled = buoi.xong;
      b.setAttribute("aria-label", noi);
      b.addEventListener("click", bam);
      return b;
    }
    for (const id of daChon) {
      const p = q.manh[id];
      oDap.appendChild(nutMảnh(p, T("Bỏ mảnh khỏi câu"), () => {
        buoi.chon = buoi.chon.filter((x) => x !== id);
        thongBao("");
        ve();
      }));
    }
    for (const p of q.xao) {
      if (daChon.includes(p.id)) continue;
      oNguon.appendChild(nutMảnh(p, T("Đưa mảnh vào câu"), () => {
        buoi.chon.push(p.id);
        thongBao("");
        ve();
      }));
    }
    $("npCheck").hidden = buoi.xong;
    $("npCheck").disabled = daChon.length !== q.manh.length;
    $("npSkip").hidden = buoi.xong;
    $("npNext").hidden = !buoi.xong;
    $("npNext").disabled = dangGhi;
    $("npResult").hidden = !buoi.xong;
  }

  async function hienKetQua() {
    if (!buoi || !buoi.xong) return;
    const hienTai = buoi, viTri = buoi.i, q = buoi.ds[viTri];
    $("npOriginal").textContent = q.cau;
    $("npTranslation").textContent = q.nghia || T("Đang dịch câu gốc…");
    if (q.nghia || !dichCau) {
      if (!q.nghia) $("npTranslation").textContent = T("Chưa dịch được câu này.");
      return;
    }
    let dich = "";
    try { dich = String((await dichCau(q.cau)) || "").trim(); } catch (e) { /* thử lại ở buổi sau */ }
    if (buoi !== hienTai || buoi.i !== viTri) return;
    if (dich && dich !== q.cau) q.nghia = dich;
    $("npTranslation").textContent = q.nghia || T("Chưa dịch được câu này.");
  }

  async function batDau(theoLich) {
    if (!tatCa.length || dangGhi) return;
    theoLich = theoLich === true && !!ghiKetQua;
    if (docLich) { try { kho = await docLich(); } catch(e) { thongBao(T("Không đọc được lịch. Hãy thử lại."), "sai"); return; } }
    // Câu đã đóng băng không vào buổi nào, kể cả luyện tự do: làm đúng một lần là xong.
    const nguon = theoLich ? tatCa.filter(q => goc.NguPhapSrs.denHan(kho[goc.NguPhapSrs.khoa(q.cau)])) : conLai();
    if (!nguon.length) {
      thongBao(theoLich ? T("Đã hết câu đến hạn. Bạn vẫn có thể luyện tất cả.")
                        : T("Mọi câu đã đóng băng. Mở lại ở danh sách bên dưới nếu muốn luyện lại."));
      ve(); return;
    }
    // Mỗi buổi đi hết danh sách; luyện lại xáo câu và mảnh, không kẹt ở 10 câu đầu.
    const ds = nguon.map((q) => Object.assign({}, q, {
      xao: goc.NguPhap.xaoTron(q.manh) || q.xao
    }));
    for (let i = ds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ds[i], ds[j]] = [ds[j], ds[i]];
    }
    for (const q of ds) { q.tsDau = (kho[goc.NguPhapSrs.khoa(q.cau)] || {}).ts || 0;
      q.onId = Date.now() + ":" + Math.random().toString(36).slice(2); }
    buoi = { ds: ds, i: 0, dung: 0, chon: [], xong: false, sai: false, theoLich: theoLich };
    if ($("npSchedule")) $("npSchedule").textContent = theoLich ? T("Ôn theo lịch ngữ pháp") : T("Luyện tự do · không thay đổi lịch");
    $("npCount").textContent = T("Chạm từng mảnh để ghép câu gốc.");
    thongBao("");
    ve();
  }

  /**
   * Ghi kết quả một câu.
   *
   * LÀM ĐÚNG là câu bị ĐÓNG BĂNG ngay ("dung", và cả "sua" — sai rồi ghép lại
   * đúng), ở cả hai chế độ: người học không muốn luyện đi luyện lại câu đã làm
   * được. Chế độ theo lịch vẫn chấm cấp/lịch như cũ rồi mới đóng băng; chế độ tự
   * do chỉ đóng băng. Chỉ xem đáp án ("xem") thì KHÔNG đóng băng — câu ấy chưa
   * làm được; ở chế độ lịch nó được hỏi lại ngay trong buổi (câu "củng cố"), và
   * ghép đúng lần đó thì đóng băng, không chấm cấp thêm lần nữa.
   */
  async function ketThuc(kq) {
    const b = buoi, q = b.ds[b.i];
    if (!ghiKetQua) return;
    const chiBang = !b.theoLich || !!q.cungCo;
    if (chiBang && kq === "xem") return;
    dangGhi = true; ve();
    try {
      const r = await ghiKetQua(q, kq, chiBang);
      if (r) kho[goc.NguPhapSrs.khoa(q.cau)] = r;
      if (buoi !== b) return;
      if ($("npSchedule")) $("npSchedule").textContent = !r
        ? T("Lịch đã thay đổi hoặc câu không còn trong sổ. Lượt này không tăng cấp.")
        : (r.dongBang ? T("Đã đóng băng câu này — sẽ không hiện lại. Mở lại ở danh sách câu đóng băng.")
                      : T2("Cấp ngữ pháp {lv} · ôn lại sau {n} ngày", { lv: r.lv, n: r.ngay }));
      if (kq === "xem" && r && b.theoLich && !q.cungCo) b.ds.push(Object.assign({}, q, { cungCo: true, xao: goc.NguPhap.xaoTron(q.manh) || q.xao }));
    } catch(e) {
      if (buoi === b) { b.chuaGhi = kq; thongBao(T("Chưa lưu được lịch. Bấm Câu tiếp để thử lưu lại."), "sai"); }
    } finally { dangGhi = false; if (buoi === b) ve(); }
  }

  async function kiemTra() {
    if (!buoi || buoi.xong) return;
    const q = buoi.ds[buoi.i];
    if (buoi.chon.length !== q.manh.length) return;
    const cau = buoi.chon.map((id) => q.manh[id].text).join("");
    if (cau !== q.cau) {
      buoi.sai = true;
      thongBao(T("Chưa khớp câu gốc. Chạm mảnh trong câu để đổi chỗ rồi thử lại."), "sai");
      return;
    }
    buoi.xong = true;
    buoi.dung++;
    thongBao(T("Đúng rồi!"), "dung");
    ve();
    hienKetQua();
    await ketThuc(buoi.sai ? "sua" : "dung");
  }

  async function boQua() {
    if (!buoi || buoi.xong) return;
    buoi.xong = true;
    thongBao(T("Đây là đáp án."), "dap-an");
    ve();
    hienKetQua();
    await ketThuc("xem");
  }

  async function tiep() {
    if (!buoi || !buoi.xong || dangGhi) return;
    if (buoi.chuaGhi) { const kq = buoi.chuaGhi; delete buoi.chuaGhi; await ketThuc(kq); if (buoi.chuaGhi) return; }
    buoi.i++;
    buoi.chon = [];
    buoi.xong = false;
    buoi.sai = false;
    if ($("npSchedule")) $("npSchedule").textContent = buoi.ds[buoi.i] && buoi.ds[buoi.i].cungCo ? T("Củng cố · không tăng cấp") : (buoi.theoLich ? T("Ôn theo lịch ngữ pháp") : T("Luyện tự do · không thay đổi lịch"));
    thongBao("");
    ve();
  }

  async function lamMoi() {
    if (!layMuc || !ngonNgu) return;
    if (ngonNgu() !== "ja") {
      tatCa = []; buoi = null;
      $("npCount").textContent = T("Chuyển sang Nhật – Việt để luyện ngữ pháp.");
      ve();
      return;
    }
    try {
      tatCa = goc.NguPhap.danhSach(await layMuc());
      if (docLich) kho = await docLich();
      if (ghiKetQua && $("npStats")) veThongKe();
      if (!buoi) $("npCount").textContent = tatCa.length
        ? T2("Có {n} câu từ sổ tay để luyện.", { n: tatCa.length })
        : T("Chưa có câu tiếng Nhật đủ ngữ cảnh. Hãy lưu từ trong một câu trọn vẹn hoặc lưu câu từ video.");
    } catch (e) {
      tatCa = [];
      $("npCount").textContent = T("Không đọc được sổ tay. Hãy thử mở lại mục này.");
    }
    ve();
  }

  function khoiTao(cauHinh) {
    layMuc = cauHinh.layMuc;
    ngonNgu = cauHinh.ngonNgu;
    dichCau = cauHinh.dichCau;
    docLich = cauHinh.docLich || null; ghiKetQua = cauHinh.ghiKetQua || null;
    if (!daGan) {
      $("npStart").addEventListener("click", () => batDau(false));
      if ($("npDue")) $("npDue").addEventListener("click", () => batDau(true));
      $("npCheck").addEventListener("click", kiemTra);
      $("npSkip").addEventListener("click", boQua);
      $("npNext").addEventListener("click", tiep);
      daGan = true;
    }
  }

  goc.NguPhapUI = { khoiTao, lamMoi };
})(typeof self !== "undefined" ? self : this);
