/**
 * THAO TÁC CHẠM & VUỐT KIỂU ANDROID
 * ==================================
 * Ba thứ mà app điện thoại nào cũng phải có, mà bản web nhét vào WebView thì
 * thường thiếu — nên dùng cứ thấy "không giống app thật":
 *
 *   1. Vuốt ngang để đổi tab
 *   2. Nút Quay lại của máy lùi từng bước, không thoát thẳng app
 *   3. Kéo xuống ở đầu danh sách để làm mới
 *
 * Cách làm chép từ app Denken 3 Shuu (state/useSwipeTabs.ts) vì ở đó đã chỉnh
 * đi chỉnh lại cho hết bắt nhầm; phần dưới đây là bản JS thuần, không React.
 */
"use strict";
(function (root) {

  /* ==================================================================== */
  /* 1. Vuốt ngang đổi tab                                                */
  /* ==================================================================== */

  /** Đi ngang ít nhất bấy nhiêu pixel mới tính. */
  const NGUONG = 60;
  /** Đi ngang phải gấp bấy nhiêu lần đi dọc. */
  const TI_LE = 1.6;
  /** Lâu hơn bấy nhiêu mili giây thì coi như đang kéo chứ không phải vuốt. */
  const HAN_GIO = 600;

  /**
   * Chỗ chạm có nằm trong thứ gì tự cuộn ngang được không.
   *
   * Đây mới là phần khó, chứ bắt cử chỉ vuốt thì dễ. Trong app có mấy thứ tự
   * cuộn ngang: hàng chip sổ con, lịch nhiệt 17 tuần. Cứ thấy ngón tay đi ngang
   * là đổi tab thì kéo hàng chip sang trái một cái là văng sang màn khác — bực
   * hơn hẳn so với không có tính năng này.
   */
  function trongVungCuonNgang(target) {
    let node = target;
    while (node && node !== document.body && node.nodeType === 1) {
      if (node.scrollWidth > node.clientWidth + 4) {
        const kieu = getComputedStyle(node).overflowX;
        if (kieu === "auto" || kieu === "scroll") return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  /** Đang có hộp thoại/lớp phủ nào mở không — lúc đó không đổi tab. */
  function dangCoLopPhu() {
    return !!document.querySelector(".sheet.show, .celebrate.show");
  }

  /**
   * @param {() => number} chiSo   tab đang mở là tab thứ mấy
   * @param {() => number} tong    tổng số tab
   * @param {(toi:number) => void} doi  đổi sang tab thứ mấy
   */
  function vuotDoiTab(chiSo, tong, doi) {
    let x0 = 0, y0 = 0, luc = 0, theoDoi = false, keoNgang = false, vung = null;
    const giamChuyen = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** Trả màn về chỗ cũ, có animation ngắn nếu `muot`. */
    const traVe = (muot) => {
      const v = vung;
      vung = null;
      if (!v) return;
      if (!muot) { v.style.transition = ""; v.style.transform = ""; v.style.opacity = ""; v.style.willChange = ""; return; }
      v.style.transition = "transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s";
      v.style.transform = "";
      v.style.opacity = "";
      setTimeout(() => { v.style.transition = ""; v.style.willChange = ""; }, 220);
    };

    const batDau = (e) => {
      // Hai ngón là đang phóng to thu nhỏ, không phải vuốt.
      if (e.touches.length !== 1 || dangCoLopPhu() || trongVungCuonNgang(e.target)) {
        theoDoi = false;
        return;
      }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      luc = Date.now();
      theoDoi = true;
      keoNgang = false;
      traVe(false);
    };

    /*
     * Màn đi THEO NGÓN TAY khi đã rõ là đang vuốt ngang.
     *
     * Trước đây không có gì xảy ra cho tới lúc nhấc tay, rồi nội dung nhảy một
     * phát — cảm giác "cứng", không ra đang kéo trang. Giờ màn hiện tại trượt
     * theo ngón (có lực cản), mờ dần; thả ra thì đổi tab, hoặc trượt về chỗ cũ
     * nếu chưa đủ ngưỡng. Ở tab đầu/cuối, kéo ra ngoài bị cản mạnh hơn nhiều để
     * người dùng biết đã hết đường.
     */
    const diChuyen = (e) => {
      if (!theoDoi || giamChuyen) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - x0, dy = t.clientY - y0;
      if (!keoNgang) {
        // Chưa chốt hướng: đợi tới khi rõ ràng đi ngang, kẻo cuộn dọc cũng bị giật.
        if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * TI_LE) return;
        keoNgang = true;
        vung = document.querySelector(".view.show");
        if (vung) vung.style.willChange = "transform, opacity";
      }
      if (!vung) return;
      const toi = dx < 0 ? chiSo() + 1 : chiSo() - 1;
      const coDuong = toi >= 0 && toi < tong();
      const keo = dx * (coDuong ? 0.45 : 0.15);
      vung.style.transition = "none";
      vung.style.transform = "translateX(" + keo.toFixed(1) + "px)";
      vung.style.opacity = String(Math.max(0.5, 1 - Math.abs(keo) / 320));
    };

    const ketThuc = (e) => {
      if (!theoDoi) return;
      theoDoi = false;
      const cham = e.changedTouches[0];
      if (!cham) { traVe(true); return; }
      const dx = cham.clientX - x0;
      const dy = cham.clientY - y0;
      const dt = Date.now() - luc;
      // Vuốt nhanh thì ngắn hơn một chút cũng tính: người ta hất tay, không kéo hết cỡ.
      const du = Math.abs(dx) >= NGUONG || (dt < 220 && Math.abs(dx) >= NGUONG * 0.6);
      // Không có điều kiện này thì cuộn dọc hơi chéo tay một chút là đổi tab.
      if (dt > HAN_GIO || !du || Math.abs(dx) < Math.abs(dy) * TI_LE) { traVe(true); return; }

      // Vuốt sang TRÁI nghĩa là kéo màn kế tiếp vào, tức là đi tới.
      const toi = dx < 0 ? chiSo() + 1 : chiSo() - 1;
      if (toi >= 0 && toi < tong()) { traVe(false); doi(toi); }
      else traVe(true);                 // hết đường: trượt về chỗ cũ
    };

    // `passive` để trình duyệt khỏi phải chờ xem ta có chặn cuộn không — ta
    // không chặn bao giờ, mà chờ là cuộn bị khựng.
    window.addEventListener("touchstart", batDau, { passive: true });
    window.addEventListener("touchmove", diChuyen, { passive: true });
    window.addEventListener("touchend", ketThuc, { passive: true });
    window.addEventListener("touchcancel", () => { theoDoi = false; traVe(true); }, { passive: true });
  }

  /* ==================================================================== */
  /* 2. Nút Quay lại của Android                                          */
  /* ==================================================================== */

  /**
   * Gắn xử lý cho nút Quay lại.
   *
   * Không có cái này thì vuốt về là **thoát thẳng app** dù đang ở giữa màn nào,
   * kể cả khi có hộp thoại đang mở — đúng cái cảm giác "vuốt về không mượt".
   *
   * @param {() => boolean} xuLy  trả về true nếu đã xử lý (đóng hộp thoại, lùi
   *                              một tab…); trả về false thì mới thật sự thoát.
   */
  function nutQuayLai(xuLy) {
    const App = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) || null;
    if (App && App.addListener) {
      App.addListener("backButton", () => {
        if (xuLy()) return;
        if (App.exitApp) App.exitApp();
      });
      return;
    }
    // Chạy thử trên trình duyệt: mượn lịch sử trình duyệt cho giống.
    history.pushState({ nn: 1 }, "");
    window.addEventListener("popstate", () => {
      if (xuLy()) history.pushState({ nn: 1 }, "");
    });
  }

  /* ==================================================================== */
  /* 3. Kéo xuống để làm mới                                              */
  /* ==================================================================== */

  /** Kéo quá bấy nhiêu pixel rồi thả thì mới chạy. */
  const NGUONG_KEO = 74;
  /** Kéo được tối đa bấy nhiêu — có lực cản để không kéo tuột cả màn hình. */
  const KEO_TOI_DA = 110;

  /**
   * Kéo xuống ở đầu vùng cuộn để làm mới, như Gmail hay Chrome.
   *
   * Chỉ nhận khi vùng cuộn đang ở đúng đỉnh (scrollTop === 0), nếu không thì
   * mỗi lần cuộn ngược lên tới đầu là lại kích hoạt nhầm.
   *
   * @param {HTMLElement} vung  vùng cuộn
   * @param {() => Promise<any>} lamMoi
   */
  function keoDeLamMoi(vung, lamMoi) {
    let y0 = 0, keo = false, dangChay = false;

    const vong = document.createElement("div");
    vong.className = "ptr";
    vong.innerHTML = (root.Icon ? root.Icon("arrows-clockwise", { size: 20 }) : "");
    document.body.appendChild(vong);

    const dat = (d, muot) => {
      // Đang kéo thì KHÔNG được có transition: nó làm vòng tròn lê theo ngón tay
      // chậm hơn 0,2 giây. Chỉ lúc thả (về chỗ cũ / vào trạng thái quay) mới mượt.
      vong.style.transition = muot ? "" : "none";
      vong.style.transform = "translate(-50%," + d + "px)";
      vong.style.opacity = String(Math.min(1, d / NGUONG_KEO));
      vong.firstChild && (vong.firstChild.style.transform = "rotate(" + (d * 3) + "deg)");
    };

    vung.addEventListener("touchstart", (e) => {
      if (dangChay || e.touches.length !== 1 || vung.scrollTop > 0 || dangCoLopPhu()) { keo = false; return; }
      y0 = e.touches[0].clientY;
      keo = true;
    }, { passive: true });

    vung.addEventListener("touchmove", (e) => {
      if (!keo) return;
      const dy = e.touches[0].clientY - y0;
      if (dy <= 0) { dat(0); return; }
      // Lực cản: kéo càng xa càng nặng tay, giống hệt cảm giác của Android.
      dat(Math.min(KEO_TOI_DA, dy * 0.5));
    }, { passive: true });

    const thuong = async () => {
      if (!keo) return;
      keo = false;
      const d = parseFloat((vong.style.transform.match(/,\s*([-\d.]+)px/) || [0, 0])[1]) || 0;
      if (d < NGUONG_KEO) { dat(0, true); return; }
      dangChay = true;
      vong.classList.add("spin");
      dat(NGUONG_KEO, true);
      try { await lamMoi(); } catch (e) { /* mất mạng thì thôi */ }
      vong.classList.remove("spin");
      dat(0, true);
      dangChay = false;
    };
    vung.addEventListener("touchend", thuong, { passive: true });
    vung.addEventListener("touchcancel", () => { keo = false; dat(0, true); }, { passive: true });
  }

  /* ==================================================================== */

  root.ChamVuot = { vuotDoiTab, nutQuayLai, keoDeLamMoi };
})(window);
