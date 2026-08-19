/**
 * Ngôn ngữ giao diện: tiếng Việt, tiếng Anh, tiếng Nhật.
 *
 * Bảng tra lấy CHÍNH CHUỖI TIẾNG VIỆT làm khoá, chứ không đặt tên khoá kiểu
 * "nb.title". Hai lý do:
 *
 *   - Chỗ gọi vẫn đọc ra nghĩa: `T("Sổ tay")` nói rõ nó in ra cái gì, còn
 *     `T("nb.title")` thì phải mở bảng tra mới biết.
 *   - Thiếu bản dịch thì rơi về tiếng Việt — người dùng thấy một dòng chưa
 *     dịch, chứ không thấy một cái khoá trần trụi. Sai sót lộ ra mà không làm
 *     hỏng màn hình.
 *
 * Đổi lại: sửa câu tiếng Việt là đứt liên kết với bản dịch. Chấp nhận được, vì
 * hậu quả chỉ là dòng đó về lại tiếng Việt chứ không vỡ gì.
 *
 * Trong HTML thì đánh dấu `data-chu` lên phần tử, KHÔNG cần ghi khoá: chính
 * chữ đang nằm trong phần tử là khoá. `data-chu-ph` cho placeholder,
 * `data-chu-title` cho tooltip.
 */
(function (goc) {
  "use strict";

  const DS = ["vi", "en", "ja"];
  const TEN = { vi: "Tiếng Việt", en: "English", ja: "日本語" };

  /* Bảng dịch nằm ở tệp riêng để tệp này chỉ còn phần máy móc. */
  const BANG = (goc.CHU_BANG || { en: {}, ja: {} });

  let ma = "vi";

  function hopLe(x) { return DS.indexOf(x) >= 0 ? x : "vi"; }

  /** Dịch một chuỗi. Không có bản dịch thì trả về nguyên bản tiếng Việt. */
  function T(vi) {
    if (ma === "vi") return vi;
    const b = BANG[ma];
    const k = String(vi == null ? "" : vi);
    return (b && b[k]) || k;
  }

  /**
   * Dịch một câu có chỗ trống: T2("Đang hiện {n} mục", { n: 12 }).
   *
   * Nối chuỗi kiểu `"Đang hiện " + n + " mục"` thì mỗi mảnh phải dịch riêng, mà
   * trật tự từ mỗi thứ tiếng một khác — tiếng Nhật đếm xong mới tới danh từ.
   * Dịch cả câu rồi mới điền số vào thì thứ tiếng nào cũng đặt được chỗ trống
   * đúng chỗ của nó.
   */
  function T2(vi, thay) {
    let r = T(vi);
    for (const k in (thay || {})) r = r.split("{" + k + "}").join(thay[k]);
    return r;
  }

  /**
   * Chữ của một phần tử, chỉ tính phần CHỮ chứ không tính phần tử con.
   *
   * `<button>Học ngay <span>3</span></button>` thì khoá là "Học ngay", và lúc
   * dịch chỉ thay đúng nút chữ đó. Gán thẳng textContent là xoá luôn cái span
   * đếm số bên trong — nút mất số, mà chẳng ai ngờ chuyện đổi ngôn ngữ lại làm
   * hỏng cái đó.
   */
  function nutChu(el) {
    for (let i = 0; i < el.childNodes.length; i++) {
      const n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim()) return n;
    }
    return null;
  }

  /**
   * Quét một cây DOM và dịch mọi phần tử có đánh dấu.
   *
   * Chữ gốc được giữ lại trong `data-chu-goc` ngay lần đầu chạy: sau khi đã
   * dịch sang tiếng Nhật thì chữ trong phần tử không còn là khoá nữa, đổi tiếp
   * sang tiếng Anh mà lấy nó làm khoá thì tra trượt.
   */
  function ve(root) {
    // Chạy được cả ngoài trình duyệt (bài thử chạy bằng node), lúc đó chỉ có
    // phần tra chuỗi là có nghĩa.
    const r = root || (typeof document !== "undefined" ? document : null);
    if (!r || !r.querySelectorAll) return;
    r.querySelectorAll("[data-chu]").forEach(function (el) {
      const nut = nutChu(el);
      if (!nut) { if (el.dataset.chuGoc) el.textContent = T(el.dataset.chuGoc); return; }
      if (el.dataset.chuGoc === undefined) el.dataset.chuGoc = nut.nodeValue.trim();
      // Giữ lại khoảng trắng hai bên: "Học ngay " có dấu cách trước cái span.
      const truoc = nut.nodeValue.match(/^\s*/)[0];
      const sau = nut.nodeValue.match(/\s*$/)[0];
      nut.nodeValue = truoc + T(el.dataset.chuGoc) + sau;
    });
    r.querySelectorAll("[data-chu-ph]").forEach(function (el) {
      if (el.dataset.chuPhGoc === undefined) el.dataset.chuPhGoc = el.placeholder || "";
      el.placeholder = T(el.dataset.chuPhGoc);
    });
    r.querySelectorAll("[data-chu-title]").forEach(function (el) {
      if (el.dataset.chuTitleGoc === undefined) el.dataset.chuTitleGoc = el.title || "";
      el.title = T(el.dataset.chuTitleGoc);
    });
  }

  /** Đổi ngôn ngữ giao diện và vẽ lại. */
  function dat(x, root) {
    ma = hopLe(x);
    try { document.documentElement.lang = ma; } catch (e) { /* không có DOM thì thôi */ }
    ve(root);
    return ma;
  }

  goc.Chu = {
    DS: DS, TEN: TEN,
    hopLe: hopLe,
    dang: function () { return ma; },
    t: T,
    t2: T2,
    dat: dat,
    ve: ve
  };
  goc.T = T;
  goc.T2 = T2;
  if (typeof module !== "undefined" && module.exports) module.exports = goc.Chu;
})(typeof self !== "undefined" ? self : this);
