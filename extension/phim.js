/**
 * Giữ phím cho ô soạn thảo nằm trong shadow DOM.
 *
 * Trang bên dưới — YouTube là ca nặng nhất — bắt phím tắt MỘT KÝ TỰ ở tận
 * `document`: Space dừng video, j/k tua, / nhảy vào ô tìm kiếm. Bình thường mấy
 * bộ bắt phím ấy đều biết tránh khi người ta đang gõ: chúng hỏi `event.target`
 * (hoặc `document.activeElement`) có phải chỗ nhập chữ không.
 *
 * Nhưng ô soạn thảo của bảng này nằm trong shadow root. Nhìn từ ngoài, trình
 * duyệt ĐỔI TARGET về thẻ chủ — trang chỉ thấy một cái <div>, kết luận "không
 * ai đang gõ", thế là mỗi lần bấm Space giữa câu là video dừng lại.
 *
 * Chặn sự kiện không cứu được. Muốn chặn kịp thì phải bắt ở pha capture trên
 * `window`, mà chặn ở đó thì chính ô soạn thảo cũng không nhận được phím nữa —
 * gõ vào không ra chữ. Còn bắt ở chính ô soạn thảo thì đã muộn: bộ bắt phím của
 * trang chạy ở pha capture, tức là TRƯỚC khi phím tới nơi.
 *
 * Nên thay vì tranh sự kiện, ta trả lời thẳng câu hỏi mà trang đang hỏi: trong
 * lúc gõ thì đánh dấu thẻ chủ là contenteditable. Thẻ chủ chẳng có đứa con nào
 * ở light DOM (tất cả nằm trong shadow root), nên dấu ấy không cho phép sửa gì
 * cả — nhưng `target.isContentEditable` thành true và trang tự tránh đường.
 *
 * Đếm chứ không bật/tắt: một lúc có thể mở nhiều ô soạn thảo, đóng cái này mà
 * gỡ dấu luôn thì cái kia đang gõ dở lại lãnh đủ.
 */
(function (goc) {
  "use strict";

  const DAU = "data-ndict-dang-go";

  /* ------------------------------------------------------------------ *
   * Lớp chắn thứ HAI: chặn phím ở pha capture trên window
   * ------------------------------------------------------------------
   *
   * Dấu contenteditable ở trên chỉ ăn thua khi trang chịu HỎI. YouTube có hỏi
   * hay không thì mình không quyết được, mà thực tế cho thấy vẫn lọt: đang sửa
   * bản dịch trong popup, bấm Space là video vẫn tắt bật.
   *
   * Nên cần một lớp không phụ thuộc vào thiện chí của trang. Chỗ sớm nhất trong
   * đường đi của một sự kiện là `window` ở pha capture — sớm hơn mọi listener
   * của trang trên `document`. Bắt ở đó rồi `stopPropagation()`.
   *
   * Điểm mấu chốt khiến cách này KHÔNG làm chết việc gõ: `stopPropagation` chỉ
   * chặn các LISTENER, còn việc chữ được chèn vào ô soạn thảo là HÀNH ĐỘNG MẶC
   * ĐỊNH của trình duyệt — nó vẫn xảy ra, miễn là đừng gọi `preventDefault`.
   *
   * Escape/Enter/Tab thì cho đi tiếp, vì chính ô soạn thảo của mình đang nghe
   * hai phím đó để lưu và huỷ. Trang có thấy Escape cũng chẳng sao.
   */
  const CHO_QUA = { Escape: 1, Enter: 1, Tab: 1 };
  const dangGiu = new Set();
  let daGai = false;

  function tuTrongO(e) {
    if (!dangGiu.size) return false;
    const duong = e.composedPath ? e.composedPath() : [];
    for (const n of duong) if (dangGiu.has(n)) return true;
    return false;
  }

  function chan(e) {
    if (CHO_QUA[e.key]) return;
    if (tuTrongO(e)) e.stopPropagation();
  }

  function gai(bat) {
    if (bat === daGai) return;
    daGai = bat;
    const lam = bat ? "addEventListener" : "removeEventListener";
    for (const ten of ["keydown", "keypress", "keyup"]) goc[lam](ten, chan, true);
  }

  /**
   * @param {Element} host thẻ chủ của shadow root chứa ô soạn thảo
   * @param {boolean} bat đang mở thêm một ô, hay vừa đóng một ô
   */
  function giuPhim(host, bat) {
    if (!host || !host.setAttribute) return;
    const con = Math.max(0, (+host.getAttribute(DAU) || 0) + (bat ? 1 : -1));
    if (con > 0) {
      host.setAttribute(DAU, String(con));
      host.setAttribute("contenteditable", "true");
      dangGiu.add(host);
    } else {
      host.removeAttribute(DAU);
      host.removeAttribute("contenteditable");
      dangGiu.delete(host);
    }
    gai(dangGiu.size > 0);
    return con;
  }

  goc.Phim = { giuPhim };
})(typeof self !== "undefined" ? self : this);
