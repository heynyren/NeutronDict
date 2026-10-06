/**
 * VUỐT THẺ KIỂU QUIZLET — dùng chung cho extension (chuột) và Android (cảm ứng).
 *
 * Kéo thẻ sang PHẢI rồi thả: thẻ bay đi kèm dấu V xanh = Nhớ. Kéo sang TRÁI: bay
 * đi kèm dấu X đỏ = Quên. Thẻ kế tiếp hiện lên ngay phía sau (xem `vao`).
 *
 * Module này chỉ lo CỬ CHỈ và HOẠT ẢNH. Việc chấm điểm, ghi sổ, hàng đợi vẫn của
 * màn học từng nền tảng: ở đây chỉ gọi lại `chamXong(nho)` khi người dùng thả tay
 * đủ xa. Nhờ vậy vuốt, nút bấm và phím F/J đi chung MỘT đường chấm.
 *
 * Hoạt ảnh bay đi làm bằng BẢN SAO của thẻ (`bay`), không phải bằng chính thẻ:
 * chấm xong là nội dung thẻ thật được thay bằng thẻ kế ngay, mà bắt thẻ thật vừa
 * bay vừa đổi chữ thì thấy chữ mới trượt đi — hỏng đúng hiệu ứng đang cần.
 */
(function (goc) {
  "use strict";
  /** Kéo xa ít nhất bấy nhiêu px thì tính là đã chấm. */
  const NGUONG = 110;
  /** Hất nhanh thì ngắn hơn cũng tính (px/ms), miễn đã đi đủ NGUONG_NHANH. */
  const VAN_TOC = 0.6, NGUONG_NHANH = 50;
  const giamChuyen = () => !!(goc.matchMedia && goc.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const SVG_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
  const SVG_V = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.8l5 5L19.5 7"/></svg>';

  /** Dấu V/X nằm trên thẻ, đậm dần theo độ kéo. Dựng một lần, dùng lại mãi. */
  function dauCua(khung) {
    let d = khung.querySelector(":scope > .the-dau");
    if (!d) {
      d = document.createElement("div");
      d.className = "the-dau";
      d.setAttribute("aria-hidden", "true");
      khung.appendChild(d);
    }
    return d;
  }
  function datDau(d, nho, do_) {
    if (d.dataset.k !== (nho ? "nho" : "quen")) {
      d.dataset.k = nho ? "nho" : "quen";
      d.innerHTML = nho ? SVG_V : SVG_X;
    }
    d.className = "the-dau " + (nho ? "nho" : "quen");
    d.style.opacity = String(Math.max(0, Math.min(1, do_)));
  }

  /**
   * Bản sao thẻ bay ra khỏi màn. `dx` là chỗ thẻ đang nằm (đang kéo dở) để bay
   * tiếp từ đó; bấm nút / phím thì dx = 0 và thẻ bắt đầu từ chỗ cũ.
   */
  function bay(khung, nho, dx) {
    if (!khung || giamChuyen()) return;
    const r = khung.getBoundingClientRect();
    if (!r.width) return;
    const g = khung.cloneNode(true);
    g.removeAttribute("id");
    for (const e of g.querySelectorAll("[id]")) e.removeAttribute("id");
    g.className = (khung.className || "").replace(/\b(the-vao|dang-keo)\b/g, "") + " the-bay";
    g.style.cssText = "position:fixed;margin:0;left:" + r.left + "px;top:" + r.top + "px;width:" + r.width +
      "px;height:" + r.height + "px;z-index:263;pointer-events:none;transition:none;transform:translateX(" +
      (dx || 0) + "px) rotate(" + ((dx || 0) / 20) + "deg);opacity:1;";
    datDau(dauCua(g), nho, 1);
    document.body.appendChild(g);
    // Thẻ thật ẩn đi cho tới khi thẻ kế được vẽ (showCard trả lại), không thì thẻ
    // cũ vẫn nằm đó vài chục mili giây trong lúc bản sao đang bay.
    khung.style.visibility = "hidden";
    void g.offsetWidth;
    const xa = (nho ? 1 : -1) * (goc.innerWidth + r.width);
    g.style.transition = "transform .42s cubic-bezier(.35,.05,.75,.45), opacity .42s ease-in";
    g.style.transform = "translate(" + xa + "px," + (-30) + "px) rotate(" + (nho ? 26 : -26) + "deg)";
    g.style.opacity = "0";
    setTimeout(() => g.remove(), 480);
  }

  /** Thẻ mới hiện lên: phóng nhẹ từ nhỏ ra, kèm mờ dần. */
  function vao(khung) {
    if (!khung || giamChuyen()) return;
    khung.classList.remove("the-vao");
    void khung.offsetWidth;
    khung.classList.add("the-vao");
    setTimeout(() => khung.classList.remove("the-vao"), 360);
  }

  // Nút/chip KHÔNG nằm trong danh sách: trên điện thoại thẻ gần như kín nút, loại hết thì
  // chẳng còn chỗ nào để đặt ngón tay mà vuốt. Bấm vẫn là bấm (không xê dịch thì không phải
  // vuốt), còn cú nhả sau khi vuốt thì `click` bị nuốt — xem cuối `gan`.
  const KHONG_KEO = "input, textarea, select, audio, [contenteditable='true'], .dien-o, .np-piece, .the-khong-keo";

  /**
   * @param {HTMLElement} khung  mặt thẻ
   * @param {{duocKeo:()=>boolean, chamXong:(nho:boolean, dx:number)=>void, chuaDuoc?:()=>void}} ch
   *   `duocKeo`: thẻ này đang được phép chấm bằng vuốt không (chưa lật thì không);
   *   `chuaDuoc`: gọi khi người dùng vuốt đủ xa mà chưa được phép, để nhắc họ.
   */
  function gan(khung, ch) {
    let dang = null, vuaKeo = false;
    const tra = (muot) => {
      khung.style.transition = muot ? "transform .22s cubic-bezier(.2,.9,.3,1)" : "none";
      khung.style.transform = "";
      khung.classList.remove("dang-keo", "keo-nho", "keo-quen");
      const d = khung.querySelector(":scope > .the-dau");
      if (d) d.style.opacity = "0";
      if (muot) setTimeout(() => { khung.style.transition = ""; }, 240);
      else khung.style.transition = "";
    };

    khung.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target.closest && e.target.closest(KHONG_KEO)) return;
      dang = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), keo: false, dx: 0 };
    });
    khung.addEventListener("pointermove", (e) => {
      if (!dang || e.pointerId !== dang.id) return;
      const dx = e.clientX - dang.x0, dy = e.clientY - dang.y0;
      if (!dang.keo) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.3) {
          // Đi dọc nhiều hơn: để trình duyệt cuộn, bỏ theo dõi.
          if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) dang = null;
          return;
        }
        dang.keo = true;
        try { khung.setPointerCapture(e.pointerId); } catch (x) { /* không sao */ }
        const s = goc.getSelection && goc.getSelection();
        if (s && s.removeAllRanges) s.removeAllRanges();
        khung.classList.add("dang-keo");
        khung.style.transition = "none";
      }
      const duoc = ch.duocKeo();
      // Chưa được chấm: thẻ chỉ nhích nhẹ, có lực cản — đủ để thấy là "chưa".
      const k = duoc ? dx : dx * 0.18;
      dang.dx = dx;
      khung.style.transform = "translate(" + k.toFixed(1) + "px," + (dy * 0.15).toFixed(1) + "px) rotate(" + (k / 20).toFixed(2) + "deg)";
      if (duoc) {
        const nho = dx > 0, do_ = Math.abs(dx) / NGUONG;
        khung.classList.toggle("keo-nho", nho);
        khung.classList.toggle("keo-quen", !nho);
        datDau(dauCua(khung), nho, do_);
      }
    });
    const xong = (e, huy) => {
      if (!dang || e.pointerId !== dang.id) return;
      const d = dang; dang = null;
      if (!d.keo) return;
      vuaKeo = true; setTimeout(() => { vuaKeo = false; }, 0);
      try { khung.releasePointerCapture(e.pointerId); } catch (x) { /* không sao */ }
      const dx = d.dx, dt = Math.max(1, performance.now() - d.t0);
      const du = Math.abs(dx) >= NGUONG || (Math.abs(dx) >= NGUONG_NHANH && Math.abs(dx) / dt >= VAN_TOC);
      if (huy || !du) { tra(true); return; }
      if (!ch.duocKeo()) { tra(true); if (ch.chuaDuoc) ch.chuaDuoc(); return; }
      // Bay từ đúng chỗ đang kéo: dựng bản sao rồi trả thẻ thật về, để thẻ kế hiện sạch.
      bay(khung, dx > 0, dx);
      tra(false);
      ch.chamXong(dx > 0, dx);
    };
    khung.addEventListener("pointerup", (e) => xong(e, false));
    khung.addEventListener("pointercancel", (e) => xong(e, true));
    // Nhả chuột sau cú kéo cũng sinh một `click` — nuốt nó, kẻo bấm trúng nút dưới tay.
    khung.addEventListener("click", (e) => { if (vuaKeo) { e.stopPropagation(); e.preventDefault(); } }, true);
  }

  goc.TheVuot = { gan, bay, vao, NGUONG };
})(typeof self !== "undefined" ? self : this);
