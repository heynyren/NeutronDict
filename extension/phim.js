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

  function giuPhim(host, bat) {
    if (!host || !host.setAttribute) return;
    const con = Math.max(0, (+host.getAttribute(DAU) || 0) + (bat ? 1 : -1));
    if (con > 0) {
      host.setAttribute(DAU, String(con));
      host.setAttribute("contenteditable", "true");
    } else {
      host.removeAttribute(DAU);
      host.removeAttribute("contenteditable");
    }
    return con;
  }

  goc.Phim = { giuPhim };
})(typeof self !== "undefined" ? self : this);
