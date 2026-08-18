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

  /**
   * Sổ con thuộc ngôn ngữ nào.
   *
   * Sổ con vốn không mang thông tin ngôn ngữ — hồi còn hai extension thì không
   * cần, mỗi bên một kho riêng. Gộp lại thì phải phân biệt, nếu không ở chế độ
   * tiếng Nhật vẫn thấy lù lù mấy sổ tiếng Anh với số đếm 0.
   *
   * Ba nấc, theo thứ tự tin cậy:
   *   1. `ngu` ghi thẳng trên sổ — sổ tạo từ bản này trở đi đều có.
   *   2. Suy từ các mục ĐANG dùng sổ đó: mục "javi:"/"kanji:" thì sổ là tiếng
   *      Nhật. Đây là cách nhận ra đám sổ cũ, và nó chính xác vì sổ sinh ra là
   *      để chứa mục.
   *   3. Không có gì để suy (sổ rỗng, tạo từ bản cũ) -> trả "" và được hiện ở
   *      CẢ HAI bên. Thà thừa còn hơn giấu mất sổ của người ta.
   */
  function nguCuaSo(id, so, nb) {
    if (so && hopLeChat(so.ngu)) return so.ngu;
    for (const k in (nb || {})) {
      const e = nb[k];
      if (!e || e.del || e.deck !== id) continue;
      const n = nguCuaKhoa(k);
      if (n) return n;
    }
    return "";
  }

  function hopLeChat(n) { return DS.indexOf(n) >= 0; }

  /** Chỉ giữ những sổ con thuộc ngôn ngữ này (kèm sổ chưa rõ ngôn ngữ). */
  function locSoCon(decks, nb, ngu) {
    const n = hopLe(ngu), ra = {};
    for (const id in (decks || {})) {
      const cua = nguCuaSo(id, decks[id], nb);
      if (!cua || cua === n) ra[id] = decks[id];
    }
    return ra;
  }

  /**
   * Gắn nhãn ngôn ngữ cho những sổ cũ chưa có, suy từ mục đang dùng chúng.
   * Chạy một lần lúc mở app; sổ rỗng không suy được thì để nguyên.
   */
  function ganNguChoSo(decks, nb) {
    const ra = {};
    let doi = 0;
    for (const id in (decks || {})) {
      const d = decks[id];
      if (d && hopLeChat(d.ngu)) { ra[id] = d; continue; }
      const cua = nguCuaSo(id, d, nb);
      if (!cua) { ra[id] = d; continue; }
      ra[id] = Object.assign({}, d, { ngu: cua });
      doi += 1;
    }
    return { decks: ra, doi };
  }

  /**
   * Dọn huy hiệu bị rò từ ngôn ngữ khác sang.
   *
   * Bản gộp đời đầu có một lỗi: khi đổi ngôn ngữ, tiến độ đang nạp sẵn KHÔNG
   * được đọc lại, nên huy hiệu tính từ số liệu tiếng Nhật lại bị ghi vào ngăn
   * tiếng Anh. Lỗi ấy đã sửa, nhưng dữ liệu đã bẩn thì vẫn nằm đó — và còn
   * được đẩy lên cloud.
   *
   * Luật dọn cố ý hẹp đến mức không thể oan: chỉ xoá huy hiệu của một ngôn ngữ
   * khi ngôn ngữ đó KHÔNG có lấy một ngày hoạt động nào VÀ sổ tay của nó rỗng.
   * Không học buổi nào, không lưu từ nào, thì không thể có huy hiệu — không có
   * trường hợp thật nào rơi vào đây. Ngược lại, chỉ cần có một ngày trong nhật
   * ký hay một mục trong sổ là không đụng tới, vì huy hiệu có thể là thành tích
   * cũ mà số liệu hôm nay không còn phản ánh (đã xoá bớt từ chẳng hạn).
   *
   * @returns {{hoc: object, doi: string[]}} bản đã dọn và các ngôn ngữ bị dọn.
   */
  function donHuyHieuLac(hoc, soTay) {
    const h = tachHoc(hoc);
    const doi = [];
    for (const n of DS) {
      const d = h[n];
      if (!d || !d.badges || !Object.keys(d.badges).length) continue;
      const coNgay = d.log && Object.keys(d.log).length > 0;
      const coMuc = Object.keys(locSo(soTay || {}, n)).some((k) => !(soTay[k] || {}).del);
      if (coNgay || coMuc) continue;
      h[n] = Object.assign({}, d, { badges: {} });
      doi.push(n);
    }
    return { hoc: h, doi };
  }

  goc.Ngu = {
    DS, NGAN, TEN, KHOA_SYNC,
    hopLe, tienTo, thuoc, nguCuaKhoa, locSo, boPhanKhac, tachHoc, donHuyHieuLac,
    nguCuaSo, locSoCon, ganNguChoSo,
    nganChinh: (ngu) => NGAN_CHINH[hopLe(ngu)],
    ten: (ngu) => TEN[hopLe(ngu)],
    khoaSync: (ngu) => KHOA_SYNC[hopLe(ngu)]
  };
})(typeof self !== "undefined" ? self : this);
