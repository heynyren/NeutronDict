/**
 * MỘT MỤC SỔ TAY — phần xử lý phải giống hệt nhau ở mọi màn
 * =========================================================
 * Xoá một mục và đọc lại "bản của bạn" là hai việc nhỏ, nhưng làm ở sáu chỗ
 * khác nhau (nền, popup tại chỗ, popup thanh công cụ, sổ tay, buổi học, bản
 * Android). Sáu bản chép tay thì sớm muộn cũng lệch nhau một chỗ, mà chỗ lệch
 * đó lại đúng là chỗ làm mất công hiệu đính của bạn. Nên gom về đây.
 */
"use strict";
(function (root) {

  /**
   * Bia mộ cho một mục vừa bị xoá.
   *
   * Xoá thì phải xoá thật — mục biến khỏi sổ tay, khỏi sóng ôn tập, khỏi mọi
   * con số. Nhưng CÔNG HIỆU ĐÍNH của bạn thì giữ lại.
   *
   * Vì sao: xoá một từ vì đã thuộc hẳn là chuyện nên làm. Vài tháng sau quên mà
   * tra lại, nếu bản dịch chuyên ngành bạn từng chốt biến mất thì coi như phải
   * ngồi sửa lại từ đầu — mà lần này còn chẳng nhớ là mình đã từng sửa, nên rất
   * có thể chốt ra một chữ khác, rồi hai lần đọc cùng một tài liệu lại hiểu hai
   * kiểu. Bản máy dịch thì lúc nào gọi lại cũng có; bản của bạn thì không.
   *
   * Chỉ giữ khi có gì để giữ, nên bia mộ của một mục chưa từng sửa vẫn nhẹ đúng
   * như cũ — đây là thứ phải đi qua đường đồng bộ Drive mỗi lần.
   */
  function biaMo(it) {
    const t = { word: it.word, dict: it.dict, del: true, ts: Date.now() };
    if (it.mEdit) {
      t.mEdit = 1;
      t.means = (it.means || []).slice();
      if (it.mOrig) t.mOrig = it.mOrig.slice();
    }
    if (it.note) t.note = it.note;
    // Và giữ cả NGUỒN. Đường link — nhất là "phút thứ 3:47 của video này" — là thứ
    // không bao giờ tìm lại được: bản dịch máy thì gọi lúc nào cũng có, còn cái
    // video mình nghe được từ đó thì không. Xoá vì đã thuộc, vài tháng sau quên
    // mà lưu lại, đáng ra phải nghe lại được đúng chỗ cũ.
    if (it.src && it.src.url) t.src = it.src;
    return t;
  }

  /**
   * Đọc một mục trong sổ tay ra thứ mà các màn tra cứu cần biết.
   *
   * Trả về null nếu mục đó chẳng có gì đáng nói (không tồn tại, hoặc đã xoá mà
   * chưa từng được sửa). Ngược lại:
   *   - `saved`  mục HIỆN CÓ trong sổ tay hay không (bia mộ thì không).
   *   - `mEdit`, `means`  bản nghĩa bạn đã tự sửa.
   *   - `note`   ghi chú của bạn.
   *   - `src`    nguồn (trang / phút video) đã lưu từ đó.
   *
   * Tách `saved` khỏi việc "có dữ liệu của bạn" là chỗ mấu chốt: một mục đã xoá
   * vẫn đưa được bản dịch của bạn ra dùng, chỉ là nút vẫn phải hiện "Lưu" chứ
   * không phải "Đã lưu".
   */
  function banCuaBan(en) {
    if (!en) return null;
    const o = { saved: !en.del };
    if (en.note) o.note = en.note;
    if (en.mEdit) { o.mEdit = 1; o.means = (en.means || []).slice(); }
    if (en.mOrig) o.mOrig = en.mOrig.slice();
    if (en.src && en.src.url) o.src = en.src;
    if (!o.saved && !o.note && !o.mEdit && !o.src) return null;   // bia mộ trơn — coi như chưa có gì
    return o;
  }

  /**
   * Nhặt lại phần bạn tự viết từ một mục ĐÃ XOÁ, khi nó được lưu lại.
   *
   * Chỉ nhặt nghĩa đã sửa và ghi chú — không nhặt tiến độ ôn, sổ con hay tim:
   * bạn xoá nó vì đã thuộc hẳn, chứ không phải vì bấm nhầm. Lưu lại thì nó là
   * một mục mới tinh trong sóng ôn tập, chỉ có chữ nghĩa là của bạn ngày xưa.
   */
  function nhatLaiBanSua(ne, cu) {
    if (!cu || !cu.del) return ne;
    if (cu.note && !ne.note) ne.note = cu.note;
    if (cu.mEdit && !ne.mEdit) {
      ne.mEdit = 1;
      ne.means = (cu.means || []).slice();
      if (cu.mOrig) ne.mOrig = cu.mOrig.slice();
    }
    // Nguồn cũ chỉ dùng khi lượt lưu này KHÔNG có nguồn nào. Tra lại từ một
    // trang khác thì nguồn mới mới là chỗ mình vừa gặp lại nó.
    if (cu.src && cu.src.url && !(ne.src && ne.src.url)) ne.src = cu.src;
    return ne;
  }

  /**
   * Mốc thời gian của LẦN CHẤM BÀI, không phải của cả mục.
   *
   * Mục cũ chưa có `srs.ts` thì lấy tạm mốc của cả mục — bằng đúng cách nó vẫn
   * được so từ trước tới nay, nên dữ liệu cũ không đổi hành vi.
   */
  function tsSrs(e) {
    if (!e || !e.srs) return -1;
    return typeof e.srs.ts === "number" ? e.srs.ts : (e.ts || 0);
  }

  /**
   * Gộp TIẾN ĐỘ ÔN của hai bản cùng một mục, tách khỏi phép gộp cả mục.
   *
   * Vì sao phải tách: phép gộp thường là "mốc nào mới hơn thì đè cả mục". Với
   * chữ nghĩa thì đúng — bản sửa sau là ý mới nhất của bạn. Nhưng tiến độ ôn
   * KHÔNG phải thứ bạn gõ ra, nó do máy ghi lại lúc bạn chấm bài, và hai máy
   * ghi vào hai lúc khác nhau. Chấm bài trên điện thoại lên cấp 4, về máy tính
   * sửa một chữ trong ghi chú — mục ở máy tính mới hơn nên đè cả cục, và cấp 4
   * tụt về cấp 1 mà chẳng có gì báo. Công ôn tập mất im lặng là kiểu mất tệ nhất.
   *
   * Nên so riêng bằng `srs.ts`: lần CHẤM nào mới hơn thì lần đó thắng, không
   * liên quan tới lần SỬA nào mới hơn.
   *
   * Chỉ gộp khi cả hai bên đều đang có tiến độ và đều còn sống. Bia mộ cố ý
   * không mang tiến độ (xoá vì đã thuộc), và một mục vừa lưu lại sau khi xoá
   * cũng cố ý bắt đầu lại từ đầu — hai chỗ đó mà "khôi phục" tiến độ cũ thì
   * thành đi ngược lại điều người dùng vừa làm.
   */
  function gopSrs(thang, thua) {
    if (!thang || !thua || thang.del || thua.del) return thang;
    if (!thang.srs || !thua.srs) return thang;
    if (tsSrs(thua) <= tsSrs(thang)) return thang;
    const r = Object.assign({}, thang);
    r.srs = thua.srs;
    return r;
  }

  /**
   * Gộp hai kho mục: mốc mới hơn thì thắng, nhưng tiến độ ôn so riêng.
   * Đây là phép HỢP — khoá chỉ có ở một bên vẫn đi qua nguyên vẹn.
   */
  function tron(a, b) {
    const A = a || {}, B = b || {};
    const ra = {};
    for (const k in A) ra[k] = A[k];
    for (const k in B) {
      const x = ra[k], y = B[k];
      if (!x) { ra[k] = y; continue; }
      const thang = (y.ts || 0) > (x.ts || 0) ? y : x;
      ra[k] = gopSrs(thang, thang === y ? x : y);
    }
    return ra;
  }

  root.Muc = { biaMo, banCuaBan, nhatLaiBanSua, tsSrs, gopSrs, tron };
})(typeof window !== "undefined" ? window : self);
