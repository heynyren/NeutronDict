/**
 * Một khóa đọc–sửa–ghi dùng chung cho mọi trang extension và service worker.
 * Không gọi chay lồng nhau; phần gọi mạng phải hoàn tất trước khi xin khóa.
 * Chrome giải phóng khóa khi callback xong/lỗi hoặc ngữ cảnh bị đóng.
 */
(function (goc) {
  "use strict";
  const TEN = "neutrondict:ghi-so-tay";
  function chay(lam) {
    if (!goc.navigator || !goc.navigator.locks) {
      return Promise.reject(new Error("Trình duyệt chưa hỗ trợ khóa ghi dùng chung. Hãy cập nhật Chrome/Edge."));
    }
    return goc.navigator.locks.request(TEN, { mode: "exclusive" }, lam);
  }
  goc.KhoGhi = { chay, TEN };
})(typeof self !== "undefined" ? self : this);
