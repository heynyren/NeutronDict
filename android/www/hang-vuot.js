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

  /** Hai nhãn nổi sau hàng khi kéo: "Xoá" bên trái (kéo phải), "Mở link" bên phải (kéo trái). */
  function dau(hang, lop, chu) {
    let d = hang.querySelector(":scope > .hang-dau." + lop);
    if (!d) {
      d = document.createElement("div");
      d.className = "hang-dau " + lop;
      d.setAttribute("aria-hidden", "true");
      hang.appendChild(d);
    }
    d.textContent = chu;
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

    const tra = (hang, muot) => {
      hang.classList.remove("hang-keo", "keo-xoa", "keo-link");
      hang.style.transition = muot ? "transform .2s cubic-bezier(.2,.9,.3,1)" : "";
      hang.style.transform = "";
      hang.style.removeProperty("--do");
      for (const d of hang.querySelectorAll(":scope > .hang-dau")) d.style.opacity = "0";
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
      }
      dang.dx = dx;
      const rong = Math.max(1, hang.getBoundingClientRect().width);
      const phai = dx > 0;
      const coTrai = !phai && (!ch.duocTrai || ch.duocTrai(hang));
      // Kéo trái mà không có link: chỉ nhích nhẹ, có lực cản.
      const k = (phai || coTrai) ? dx : dx * 0.15;
      hang.style.transform = "translateX(" + k.toFixed(1) + "px)";
      const do_ = Math.min(1, Math.abs(dx) / Math.max(NGUONG_PX, rong * NGUONG_TL));
      hang.classList.toggle("keo-xoa", phai);
      hang.classList.toggle("keo-link", coTrai);
      hang.style.setProperty("--do", String(do_.toFixed(2)));
      const dp = dau(hang, "xoa", ch.nhanPhai || ""), dt = dau(hang, "link", ch.nhanTrai || "");
      dp.style.opacity = phai ? String(do_) : "0";
      dt.style.opacity = coTrai ? String(do_) : "0";
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
      const rong = Math.max(1, hang.getBoundingClientRect().width);
      const du = Math.abs(d.dx) >= Math.max(NGUONG_PX, rong * NGUONG_TL);
      if (huy || !du) { tra(hang, true); return; }
      if (d.dx > 0) {
        // Xoá: hàng trượt hết ra rồi mới gọi — hàm xoá gỡ hàng khỏi DOM ngay.
        hang.style.transition = "transform .16s ease-in, opacity .16s ease-in";
        hang.style.transform = "translateX(" + rong + "px)";
        hang.style.opacity = "0";
        setTimeout(() => {
          hang.style.opacity = ""; hang.style.transition = ""; hang.style.transform = "";
          hang.classList.remove("hang-keo", "keo-xoa", "keo-link");
          ch.phai(hang);
        }, 170);
      } else {
        const coLink = !ch.duocTrai || ch.duocTrai(hang);
        tra(hang, true);
        ch.trai(hang);               // có link thì mở, không thì nền tảng tự báo
        void coLink;
      }
    };
    danhSach.addEventListener("pointerup", (e) => xong(e, false));
    danhSach.addEventListener("pointercancel", (e) => xong(e, true));
    // Nhả chuột sau cú kéo cũng sinh một `click` — nuốt nó, kẻo bấm trúng nút dưới tay.
    danhSach.addEventListener("click", (e) => { if (vuaKeo) { e.stopPropagation(); e.preventDefault(); } }, true);
  }

  goc.HangVuot = { gan };
})(typeof self !== "undefined" ? self : this);
