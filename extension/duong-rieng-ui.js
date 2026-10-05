/**
 * Hộp chọn "Ôn từng đường": chỉ toàn bài nghe, toàn bài đoán nghĩa, hoặc toàn
 * bài đúng–sai (đồng nghĩa / trái nghĩa), để luyện liền một loại không bị xen.
 *
 * Dùng chung hai nền tảng; việc dựng hàng đợi và chấm điểm vẫn do màn học của
 * từng nền tảng làm — hộp này chỉ hỏi người học muốn loại nào và nói cho họ
 * biết còn bao nhiêu bài tới hạn ở loại ấy.
 */
(function(goc) {
  "use strict";
  const LUA = [
    { ma: "nghe", ds: ["nghe"], ten: "Chỉ bài nghe", mota: "Nghe một câu rồi nhận ra từ" },
    { ma: "nhin", ds: ["nhin"], ten: "Chỉ bài đoán nghĩa", mota: "Nhìn từ rồi nhớ nghĩa của nó" },
    { ma: "lien", ds: ["dong", "trai"], ten: "Chỉ bài đúng – sai", mota: "Chọn đúng từ đồng nghĩa / trái nghĩa" }
  ];

  /**
   * @param {(ds:string[]) => number} dem  số bài tới hạn của nhóm đường ấy
   * @param {(ds:string[], ma:string) => void} chon  gọi khi người học chọn một loại
   */
  function mo(dem, chon) {
    const cu = document.getElementById("duongRiengDialog");
    if (cu) { try { cu.close(); } catch (e) { /* đã đóng */ } cu.remove(); }
    const o = document.createElement("dialog");
    o.id = "duongRiengDialog"; o.className = "lich-rieng-dialog duong-rieng-dialog";
    const h = document.createElement("h3"); h.textContent = T("Ôn từng đường");
    o.appendChild(h);
    const note = document.createElement("p");
    note.textContent = T("Luyện liền một loại bài, không bị xen loại khác. Điểm và lịch ôn vẫn tính chung như học thường.");
    o.appendChild(note);
    for (const l of LUA) {
      const n = dem(l.ds);
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn block duong-rieng-lua"; b.dataset.ma = l.ma;
      b.disabled = n <= 0;
      const ten = document.createElement("strong"); ten.textContent = T(l.ten);
      const mt = document.createElement("span"); mt.className = "t-small muted";
      mt.textContent = n > 0 ? T(l.mota) + " · " + n : T("Chưa có bài nào đến hạn");
      b.appendChild(ten); b.appendChild(mt);
      b.addEventListener("click", () => { o.close(); chon(l.ds, l.ma); });
      o.appendChild(b);
    }
    // Giống hộp Lịch từng đường: không có nút Đóng, bấm ra ngoài hoặc Esc là đóng.
    o.addEventListener("click", (e) => {
      if (e.target !== o) return;
      const r = o.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) o.close();
    });
    const esc = (e) => { if (e.key === "Escape" && o.open) { e.preventDefault(); o.close(); } };
    document.addEventListener("keydown", esc, true);
    o.addEventListener("close", () => { document.removeEventListener("keydown", esc, true); o.remove(); });
    document.body.appendChild(o); o.showModal();
  }
  goc.DuongRiengUI = { mo, LUA };
})(typeof self !== "undefined" ? self : this);
