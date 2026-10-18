/**
 * CỬ CHỈ TRÊN HÀNG CỦA SỔ TAY — dùng chung cho extension (chuột) và Android (cảm ứng).
 *
 *   nhấp đúp / chạm đúp vào hàng   mở phần sửa nghĩa
 *   ấn giữ và kéo sang PHẢI        xoá nhanh (có Hoàn tác, như mọi lần xoá khác)
 *   ấn giữ và kéo sang TRÁI        mở link nguồn của từ
 *
 * Gắn MỘT lần lên cả danh sách và uỷ quyền sự kiện, vì hàng bị dựng lại liên tục (lọc, sửa,
 * cuộn lười) — gắn lên từng hàng thì mỗi lần vẽ lại là một lần gắn lại.
 *
 * Module này chỉ lo cử chỉ và hoạt ảnh; xoá, mở link, mở phiếu sửa là của từng nền tảng,
 * truyền vào qua `ch`. Nhờ vậy cử chỉ và các nút trên hàng đi chung MỘT đường xử lý.
 */
(function (goc) {
  "use strict";
  /** Phải kéo xa ít nhất bấy nhiêu px VÀ bấy nhiêu phần bề ngang hàng thì mới tính là lệnh. */
  const NGUONG_PX = 110, NGUONG_TL = 0.3;
  const HAN_DOI = 340, LECH_DOI = 26;
  // Chỉ những thứ thật sự nhận chữ/chọn thì không bắt đầu kéo; nút và chip vẫn kéo được
  // (bấm không xê dịch thì vẫn là bấm, còn cú nhả sau khi kéo thì `click` bị nuốt).
  const KHONG_KEO = "input, textarea, select, audio, [contenteditable='true'], .chon-o";
  const KHONG_DOI = KHONG_KEO + ", button, a, summary, label, .anh-hang, .lich-rieng";

  /** Lớp nền màu (đỏ / xanh) phủ hàng; chỉ đổi `opacity` nên không phải vẽ lại hàng. */
  function nen(hang) {
    let n = hang.querySelector(":scope > .hang-nen");
    if (!n) {
      n = document.createElement("div");
      n.className = "hang-nen";
      n.setAttribute("aria-hidden", "true");
      hang.appendChild(n);
    }
    return n;
  }

  /** Hai nhãn nổi sau hàng khi kéo: "Xoá" bên trái (kéo phải), "Mở link" bên phải (kéo trái). */
  function dau(hang, lop, chu) {
    let d = hang.querySelector(":scope > .hang-dau." + lop);
    if (!d) {
      d = document.createElement("div");
      d.className = "hang-dau " + lop;
      d.setAttribute("aria-hidden", "true");
      hang.appendChild(d);
    }
    if (d.textContent !== chu) d.textContent = chu;
    return d;
  }

  /**
   * @param {HTMLElement} danhSach  khung chứa các hàng `.entry`
   * @param {{
   *   phai:(hang:HTMLElement)=>void, trai:(hang:HTMLElement)=>void, nhanDoi:(hang:HTMLElement)=>void,
   *   duocTrai?:(hang:HTMLElement)=>boolean, nhanPhai?:string, nhanTrai?:string
   * }} ch
   *   `duocTrai`: hàng này có link để mở không (không có thì nhãn "Mở link" không hiện và thả tay
   *   là trượt về — người học đã được báo ở `trai`).
   */
  function gan(danhSach, ch) {
    let dang = null, vuaKeo = false, tapCuoi = null;
    const hangCua = (t) => (t && t.closest) ? t.closest(".entry") : null;

    // Cập nhật hình gộp theo khung hình: chuột đời mới bắn 120–1000 sự kiện/giây, mà mắt chỉ
    // thấy 60 khung — làm mỗi lần là phí và gây giật.
    let cho = 0, moi = null;
    const ve = () => {
      cho = 0;
      const m = moi, d = dang;
      if (!m || !d || !d.keo) return;
      const hang = d.hang;
      hang.style.transform = "translateX(" + m.k.toFixed(1) + "px)";
      if (m.loai !== d.loai) {
        d.loai = m.loai;
        const n = nen(hang);
        n.className = "hang-nen " + (m.loai || "");
        hang.querySelector(":scope > .hang-dau.xoa").style.display = m.loai === "xoa" ? "" : "none";
        hang.querySelector(":scope > .hang-dau.link").style.display = m.loai === "link" ? "" : "none";
      }
      const do_ = String(m.do_.toFixed(2));
      if (d.doCu !== do_) {
        d.doCu = do_;
        nen(hang).style.opacity = String((m.do_ * (m.loai === "xoa" ? 0.2 : 0.16)).toFixed(3));
        const dau_ = hang.querySelector(":scope > .hang-dau." + (m.loai || "xoa"));
        if (dau_) dau_.style.opacity = do_;
      }
    };
    const tra = (hang, muot) => {
      moi = null;
      hang.classList.remove("hang-keo");
      hang.style.transition = muot ? "transform .2s cubic-bezier(.2,.9,.3,1)" : "";
      hang.style.transform = "";
      for (const d of hang.querySelectorAll(":scope > .hang-dau, :scope > .hang-nen")) d.style.opacity = "0";
      if (muot) setTimeout(() => { hang.style.transition = ""; }, 220);
    };

    danhSach.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const hang = hangCua(e.target);
      if (!hang || e.target.closest(KHONG_KEO)) return;
      dang = { id: e.pointerId, hang: hang, x0: e.clientX, y0: e.clientY, t0: performance.now(),
               keo: false, dx: 0, nut: !!e.target.closest(KHONG_DOI) };
    });
    danhSach.addEventListener("pointermove", (e) => {
      if (!dang || e.pointerId !== dang.id) return;
      const dx = e.clientX - dang.x0, dy = e.clientY - dang.y0;
      const hang = dang.hang;
      if (!dang.keo) {
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.5) {
          // Đi dọc nhiều hơn: người ta đang cuộn danh sách — bỏ theo dõi.
          if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) dang = null;
          return;
        }
        dang.keo = true;
        try { danhSach.setPointerCapture(e.pointerId); } catch (x) { /* không sao */ }
        const sel = goc.getSelection && goc.getSelection();
        if (sel && sel.removeAllRanges) sel.removeAllRanges();
        hang.classList.add("hang-keo");
        hang.style.transition = "none";
        dang.rong = Math.max(1, hang.getBoundingClientRect().width);
        dang.coLink = !ch.duocTrai || ch.duocTrai(hang);
        dang.loai = null; dang.doCu = "";
        nen(hang);
        dau(hang, "xoa", ch.nhanPhai || "").style.display = "none";
        dau(hang, "link", ch.nhanTrai || "").style.display = "none";
      }
      dang.dx = dx;
      const rong = dang.rong;                       // đo MỘT lần lúc bắt đầu kéo, không đo mỗi lần di chuyển
      const phai = dx > 0;
      const coTrai = !phai && dang.coLink;
      // Kéo trái mà không có link: chỉ nhích nhẹ, có lực cản.
      const k = (phai || coTrai) ? dx : dx * 0.15;
      moi = { k: k, do_: Math.min(1, Math.abs(dx) / Math.max(NGUONG_PX, rong * NGUONG_TL)),
              loai: phai ? "xoa" : (coTrai ? "link" : "") };
      if (!cho) cho = requestAnimationFrame(ve);
    });
    const xong = (e, huy) => {
      if (!dang || e.pointerId !== dang.id) return;
      const d = dang; dang = null;
      const hang = d.hang;
      if (!d.keo) {
        // Một cú bấm không kéo: ghi nhận để nhận ra nhấp đúp.
        if (huy || d.nut) { tapCuoi = null; return; }
        const nay = performance.now();
        if (tapCuoi && tapCuoi.hang === hang && nay - tapCuoi.t < HAN_DOI
            && Math.hypot(e.clientX - tapCuoi.x, e.clientY - tapCuoi.y) < LECH_DOI) {
          tapCuoi = null;
          const sel = goc.getSelection && goc.getSelection();
          if (sel && sel.removeAllRanges) sel.removeAllRanges();
          // Trễ một nhịp — xem ghi chú ở the-vuot.js: cú click sau khi nhả tay không được rơi vào phiếu vừa mở.
          setTimeout(() => ch.nhanDoi(hang), 90);
        } else tapCuoi = { t: nay, x: e.clientX, y: e.clientY, hang: hang };
        return;
      }
      tapCuoi = null;
      vuaKeo = true; setTimeout(() => { vuaKeo = false; }, 0);
      try { danhSach.releasePointerCapture(e.pointerId); } catch (x) { /* không sao */ }
      const rong = d.rong;
      const du = Math.abs(d.dx) >= Math.max(NGUONG_PX, rong * NGUONG_TL);
      if (huy || !du) { tra(hang, true); return; }
      if (d.dx > 0) {
        // Xoá: hàng trượt hết ra rồi mới gọi — hàm xoá gỡ hàng khỏi DOM ngay.
        hang.style.transition = "transform .16s ease-in, opacity .16s ease-in";
        hang.style.transform = "translateX(" + rong + "px)";
        hang.style.opacity = "0";
        setTimeout(() => {
          hang.style.opacity = ""; hang.style.transition = ""; hang.style.transform = "";
          tra(hang, false);
          ch.phai(hang);
        }, 170);
      } else {
        tra(hang, true);
        ch.trai(hang);               // có link thì mở, không thì nền tảng tự báo
      }
    };
    danhSach.addEventListener("pointerup", (e) => xong(e, false));
    danhSach.addEventListener("pointercancel", (e) => xong(e, true));
    // Bấm giữ rồi kéo trên chữ đã bôi/ảnh/liên kết thì trình duyệt (nhất là macOS) bắt đầu KÉO-THẢ
    // NGUYÊN BẢN và huỷ chuỗi sự kiện chuột (pointercancel) — cử chỉ chết giữa chừng. Chặn nó khi
    // đang theo dõi một cú bấm, và chặn bôi chọn chữ khi đã chốt là đang vuốt.
    danhSach.addEventListener("dragstart", (e) => { if (dang) e.preventDefault(); });
    danhSach.addEventListener("selectstart", (e) => { if (dang && dang.keo) e.preventDefault(); });
    // Nhả chuột sau cú kéo cũng sinh một `click` — nuốt nó, kẻo bấm trúng nút dưới tay.
    danhSach.addEventListener("click", (e) => { if (vuaKeo) { e.stopPropagation(); e.preventDefault(); } }, true);
  }

  goc.HangVuot = { gan };
})(typeof self !== "undefined" ? self : this);
