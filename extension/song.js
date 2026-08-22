/**
 * CÒN SỐNG KHÔNG — cầu nối sang nền, biết tự tắt khi extension đã bị gỡ
 * ====================================================================
 *
 * Nạp lại extension (hoặc Chrome tự cập nhật nó) thì bản CŨ của content script
 * vẫn nằm nguyên trong những trang đang mở. Nó không bị dừng, không được báo,
 * chỉ mất đường về nhà: từ lúc ấy mọi lời gọi `chrome.*` đều ném
 * "Extension context invalidated".
 *
 * Với một trang tĩnh thì chẳng ai để ý. Nhưng bảng lời thoại YouTube chạy hẹn
 * giờ 150ms, một vòng canh DOM 700ms, và một hàng đợi dịch — nên nó bắn lỗi ấy
 * hàng chục lần một phút, mãi mãi, cho tới khi người dùng tự tải lại trang. Đó
 * đúng là cảnh trong bảng Lỗi của Chrome.
 *
 * Nên chỗ này làm hai việc:
 *   1. HỎI TRƯỚC KHI GỌI. `chrome.runtime.id` biến mất ngay khi context chết,
 *      nên chỉ cần nhìn nó là biết, không phải chờ ném lỗi rồi mới bắt.
 *   2. TẮT MỘT LẦN CHO GỌN. Lần đầu phát hiện đã chết thì chạy hết mấy hàm dọn
 *      dẹp đã đăng ký — dừng hẹn giờ, gỡ bảng — rồi im hẳn. Im lặng là đúng ở
 *      đây: người dùng không làm gì sai cả, và tải lại trang là mọi thứ trở lại.
 */
(function (goc) {
  "use strict";

  const donDep = [];
  let daChet = false;

  /** Đường về nền còn dùng được không. */
  function conSong() {
    try { return !!(typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id); }
    catch (e) { return false; }   // vài trình duyệt ném ngay khi chạm vào
  }

  /** Đăng ký một việc phải làm khi phát hiện extension đã bị gỡ. */
  function khiChet(fn) {
    if (typeof fn !== "function") return;
    if (daChet) { try { fn(); } catch (e) { /* dọn hụt cũng thôi */ } return; }
    donDep.push(fn);
  }

  function chet() {
    if (daChet) return;
    daChet = true;
    for (const f of donDep.splice(0)) {
      try { f(); } catch (e) { /* một chỗ dọn hỏng thì đừng chặn mấy chỗ kia */ }
    }
  }

  /**
   * Gửi một việc sang nền.
   * @returns {boolean} false nghĩa là đường về đã đứt — chỗ gọi cứ coi như
   *   không có kết quả, đừng bày lỗi ra màn hình.
   */
  function gui(msg, cb) {
    if (!conSong()) { chet(); return false; }
    try {
      chrome.runtime.sendMessage(msg, (kq) => {
        // PHẢI chạm vào lastError, không thì Chrome tự in cảnh báo ra console.
        const loi = chrome.runtime.lastError;
        if (cb) cb(loi ? null : kq, loi || null);
      });
      return true;
    } catch (e) { chet(); return false; }
  }

  /** Đọc kho. Đứt đường thì trả về object rỗng, đừng để chỗ gọi văng. */
  async function doc(khoa) {
    if (!conSong()) { chet(); return {}; }
    try { return await chrome.storage.local.get(khoa); }
    catch (e) { chet(); return {}; }
  }

  /** Ghi kho. Trả về false nếu không ghi được. */
  async function ghi(obj) {
    if (!conSong()) { chet(); return false; }
    try { await chrome.storage.local.set(obj); return true; }
    catch (e) { chet(); return false; }
  }

  /** Bỏ một khoá khỏi kho. Đứt đường thì thôi, không văng. */
  async function xoa(khoa) {
    if (!conSong()) { chet(); return false; }
    try { await chrome.storage.local.remove(khoa); return true; }
    catch (e) { chet(); return false; }
  }

  goc.Song = { conSong, khiChet, gui, doc, ghi, xoa };
})(typeof self !== "undefined" ? self : this);
