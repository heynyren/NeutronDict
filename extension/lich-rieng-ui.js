/** Nút điều khiển riêng mỗi đường, dùng chung trên hai nền tảng. */
(function(goc) {
  "use strict";
  function nut(it, ghi, sau) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn sm lich-rieng";
    b.textContent = T("Lịch từng đường");
    b.addEventListener("click", (e) => { e.stopPropagation(); mo(it, ghi, sau); });
    return b;
  }
  function mo(it, ghi, sau) {
    const cu = document.getElementById("lichRiengDialog"); if (cu) { try { cu.close(); } catch (e) { /* đã đóng */ } cu.remove(); }
    const o = document.createElement("dialog");
    o.id = "lichRiengDialog"; o.className = "lich-rieng-dialog";
    const h = document.createElement("h3"); h.textContent = T("Lịch từng đường");
    o.appendChild(h);
    const note = document.createElement("p");
    note.textContent = T("Hẹn lại tính từ hôm nay. Đóng băng giữ nguyên điểm và lịch; mở lại tiếp tục theo lịch đó.");
    o.appendChild(note);
    const status = document.createElement("p"); status.setAttribute("role", "status");
    const ds = document.createElement("div"); o.appendChild(ds); o.appendChild(status);
    // Không có nút Đóng: bấm ra ngoài hộp (vào phần nền mờ) là đóng, Esc cũng đóng.
    // Chỉ tính cú bấm nằm NGOÀI khung hộp — bấm vào phần đệm bên trong hộp cũng có
    // `target` là chính <dialog>, nên phải so toạ độ chứ không so `target`.
    o.addEventListener("click", (e) => {
      if (e.target !== o) return;
      const r = o.getBoundingClientRect();
      const ngoai = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (ngoai) o.close();
    });
    // Esc đóng luôn, và tự xử lý chứ không trông vào mặc định của trình duyệt: có bản
    // không đóng <dialog> bằng Esc nếu chưa có thao tác người dùng nào bên trong nó.
    // Nghe ở `document` (giai đoạn capture) vì với hộp modal, phím không nhất thiết
    // đi qua chính <dialog>. Gỡ ra khi hộp đóng để không rò hàm nghe.
    const esc = (e) => { if (e.key === "Escape" && o.open) { e.preventDefault(); o.close(); } };
    document.addEventListener("keydown", esc, true);
    o.addEventListener("close", () => { document.removeEventListener("keydown", esc, true); o.remove(); });
    function ve() {
      ds.textContent = "";
      for (const d of goc.Srs.DUONG) {
        const hang = document.createElement("section"); hang.className = "lich-rieng-hang"; hang.dataset.duong = d;
        const title = document.createElement("strong"); title.textContent = T(goc.Srs.TEN_DUONG[d]); hang.appendChild(title);
        const pref = (it.lichRieng || {})[d] || {};
        const co = goc.Srs.duongCo(it).includes(d);
        const tt = document.createElement("p");
        const due = goc.Srs.hanDuong(it, d);
        tt.textContent = it.dongBang ? T("Toàn bộ từ đang đóng băng") :
          (!co ? T("Chưa có dữ liệu cho bài này") : (pref.dongBang ? T("Đang đóng băng") :
          (due > Date.now() ? T("Hẹn ôn: ") + new Date(due).toLocaleDateString() : T("Đến hạn"))));
        hang.appendChild(tt);
        const days = document.createElement("input"); days.type = "number"; days.min = "1"; days.max = "3650";
        days.step = "1"; days.value = "7"; days.setAttribute("aria-label", T(goc.Srs.TEN_DUONG[d]) + ": " + T("Số ngày"));
        hang.appendChild(days);
        function them(chu, action) {
          const btn = document.createElement("button"); btn.type = "button"; btn.className = "btn sm"; btn.textContent = T(chu);
          btn.disabled = !co && !pref.dongBang && !pref.hen;
          btn.onclick = async () => {
            if (action === "hen" && !days.reportValidity()) return;
            const buttons = [...o.querySelectorAll("button")]; buttons.forEach(x => x.disabled = true);
            try {
              const moi = await ghi(it.key, d, action, Number(days.value));
              if (!moi) throw new Error(T("Mục đã bị xoá."));
              it = moi; status.textContent = T("Đã lưu lịch riêng."); ve();
              if (sau) await sau(it);
            } catch (e) { status.textContent = e.message || T("Chưa lưu được. Hãy thử lại."); }
            finally { if (o.isConnected) ve(); }
          };
          hang.appendChild(btn);
        }
        them("Hẹn lại", "hen");
        them(pref.dongBang ? "Mở lại đường này" : "Đóng băng đường này", pref.dongBang ? "mo" : "bang");
        if (pref.hen) them("Dùng lịch tự động", "tuDong");
        ds.appendChild(hang);
      }
    }
    ve(); document.body.appendChild(o); o.showModal();
  }
  goc.LichRiengUI = { nut, mo };
})(typeof self !== "undefined" ? self : this);
