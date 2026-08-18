/**
 * Mô hình hai ngôn ngữ trong MỘT extension.
 *
 * Vì sao tách hẳn ra một tệp nhỏ thế này: đây là chỗ duy nhất trong cả dự án mà
 * một lỗi lặng lẽ có thể XOÁ dữ liệu trên cloud. Khi đồng bộ, mình chỉ gửi lên
 * cloud phần thuộc về ngôn ngữ đó — nghĩa là mọi khoá KHÔNG được nhận diện
 * đúng sẽ biến mất khỏi bản ghi trên Drive ở lượt lưu kế tiếp.
 *
 * Cái bẫy cụ thể: sổ tay tiếng Nhật có HAI ngăn chứ không phải một —
 * "javi:" (từ vựng) và "kanji:" (Hán tự). Viết bộ lọc thành 'chỉ javi' là mất
 * sạch Hán tự trên cloud. Nên danh sách ngăn nằm ở đây, ngay đầu tệp, và có
 * bài thử riêng canh đúng chuyện đó.
 *
 * Ngoài ra: khoá sổ tay vốn ĐÃ mang tiền tố từ trước ("javi:犬", "envi:dog"),
 * nên hai thứ tiếng sống chung một kho mà không đụng nhau — không phải di trú
 * cấu trúc, chỉ cần lọc cho đúng.
 */
(function (goc) {
  "use strict";

  const DS = ["ja", "en"];

  /** Ngôn ngữ nào gồm những ngăn sổ tay nào. ĐỌC KỸ chú thích đầu tệp. */
  const NGAN = {
    ja: ["javi", "kanji"],
    en: ["envi"]
  };

  /** Ngăn mặc định khi lưu một từ mới. */
  const NGAN_CHINH = { ja: "javi", en: "envi" };

  /** Nhãn hiện ra trên nút chuyển. */
  const TEN = { ja: "Nhật", en: "Anh" };

  /**
   * Mỗi ngôn ngữ một cloud riêng.
   *
   * Cặp "syncUrl"/"syncToken" giữ nguyên tên cũ và thuộc về TIẾNG ANH — vì bản
   * gộp này lớn lên từ NeutronDict, nên người đang dùng nó không phải khai lại
   * gì cả, cloud tiếng Anh chạy tiếp y như cũ.
   */
  const KHOA_SYNC = {
    ja: { url: "syncUrlJa", token: "syncTokenJa" },
    en: { url: "syncUrl", token: "syncToken" }
  };

  function hopLe(ngu) { return DS.indexOf(ngu) >= 0 ? ngu : "en"; }

  /** Tiền tố khoá sổ tay của một ngôn ngữ: ["javi:", "kanji:"]. */
  function tienTo(ngu) { return NGAN[hopLe(ngu)].map((x) => x + ":"); }

  /** Khoá này có thuộc về ngôn ngữ đó không. */
  function thuoc(khoa, ngu) {
    const t = tienTo(ngu);
    for (const p of t) if (String(khoa).indexOf(p) === 0) return true;
    return false;
  }

  /** Ngôn ngữ của một khoá, hoặc "" nếu không nhận ra (đừng đoán bừa). */
  function nguCuaKhoa(khoa) {
    for (const n of DS) if (thuoc(khoa, n)) return n;
    return "";
  }

  /** Chỉ giữ lại phần sổ tay thuộc về ngôn ngữ này. */
  function locSo(nb, ngu) {
    const ra = {};
    for (const k in (nb || {})) if (thuoc(k, ngu)) ra[k] = nb[k];
    return ra;
  }

  /** Ngược lại: mọi thứ KHÔNG thuộc ngôn ngữ này (kể cả khoá lạ chưa biết). */
  function boPhanKhac(nb, ngu) {
    const ra = {};
    for (const k in (nb || {})) if (!thuoc(k, ngu)) ra[k] = nb[k];
    return ra;
  }

  /**
   * Tiến độ học tách theo ngôn ngữ: { ja: {...}, en: {...} }.
   *
   * Bản cũ chỉ có một object phẳng. Nó là tiến độ TIẾNG ANH (extension này vốn
   * là NeutronDict), nên chuyển nguyên vào ngăn "en" — không mất lượt nào.
   */
  function tachHoc(hoc) {
    const h = hoc || {};
    if (h.ja !== undefined || h.en !== undefined) return { ja: h.ja || null, en: h.en || null };
    const co = Object.keys(h).length ? h : null;
    return { ja: null, en: co };
  }

  goc.Ngu = {
    DS, NGAN, TEN, KHOA_SYNC,
    hopLe, tienTo, thuoc, nguCuaKhoa, locSo, boPhanKhac, tachHoc,
    nganChinh: (ngu) => NGAN_CHINH[hopLe(ngu)],
    ten: (ngu) => TEN[hopLe(ngu)],
    khoaSync: (ngu) => KHOA_SYNC[hopLe(ngu)]
  };
})(typeof self !== "undefined" ? self : this);
