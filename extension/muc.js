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
    if (!o.saved && !o.note && !o.mEdit) return null;   // bia mộ trơn — coi như chưa có gì
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
    return ne;
  }

  root.Muc = { biaMo, banCuaBan, nhatLaiBanSua };
})(typeof window !== "undefined" ? window : self);
