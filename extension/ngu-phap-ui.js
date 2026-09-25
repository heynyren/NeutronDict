/**
 * Màn luyện ngữ pháp dùng chung cho extension và Android.
 * Chỉ đọc sổ tay, giữ kết quả trong bộ nhớ của buổi hiện tại.
 */
(function (goc) {
  "use strict";

  let layMuc = null, ngonNgu = null, tatCa = [], buoi = null, daGan = false;
  const $ = (id) => document.getElementById(id);

  function thongBao(chu, loai) {
    const o = $("npFeedback");
    o.textContent = chu || "";
    o.className = "np-feedback" + (loai ? " " + loai : "");
  }

  function ve() {
    const nutBat = $("npStart"), bai = $("npExercise"), dem = $("npCount");
    if (!buoi || buoi.i >= buoi.ds.length) {
      bai.hidden = true;
      nutBat.hidden = !tatCa.length;
      nutBat.textContent = buoi ? T("Luyện lại") : T("Bắt đầu luyện");
      if (buoi) dem.textContent = T2("Đã ghép đúng {dung}/{tong} câu.", {
        dung: buoi.dung, tong: buoi.ds.length
      });
      return;
    }
    nutBat.hidden = true;
    bai.hidden = false;
    const q = buoi.ds[buoi.i];
    $("npProgress").textContent = T2("Câu {i}/{n} · {m} mảnh", {
      i: buoi.i + 1, n: buoi.ds.length, m: q.manh.length
    });
    $("npHint").textContent = q.tu !== q.cau
      ? T2("Từ đã lưu: {tu}", { tu: q.tu })
      : (q.nghia ? T2("Nghĩa: {nghia}", { nghia: q.nghia }) : T("Ghép lại câu đã lưu"));
    const daChon = buoi.chon;
    const oDap = $("npAnswer"), oNguon = $("npOptions");
    oDap.textContent = "";
    oNguon.textContent = "";
    if (!daChon.length) {
      const goi = document.createElement("span");
      goi.className = "np-placeholder";
      goi.textContent = T("Chạm các mảnh bên dưới theo đúng thứ tự");
      oDap.appendChild(goi);
    }
    function nutMảnh(p, noi, bam) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "np-piece";
      b.textContent = p.text.trim();
      b.disabled = buoi.xong;
      b.setAttribute("aria-label", noi);
      b.addEventListener("click", bam);
      return b;
    }
    for (const id of daChon) {
      const p = q.manh[id];
      oDap.appendChild(nutMảnh(p, T("Bỏ mảnh khỏi câu"), () => {
        buoi.chon = buoi.chon.filter((x) => x !== id);
        thongBao("");
        ve();
      }));
    }
    for (const p of q.xao) {
      if (daChon.includes(p.id)) continue;
      oNguon.appendChild(nutMảnh(p, T("Đưa mảnh vào câu"), () => {
        buoi.chon.push(p.id);
        thongBao("");
        ve();
      }));
    }
    $("npCheck").hidden = buoi.xong;
    $("npCheck").disabled = daChon.length !== q.manh.length;
    $("npSkip").hidden = buoi.xong;
    $("npNext").hidden = !buoi.xong;
  }

  function batDau() {
    if (!tatCa.length) return;
    buoi = { ds: tatCa.slice(0, 10), i: 0, dung: 0, chon: [], xong: false };
    $("npCount").textContent = T("Chạm từng mảnh để ghép câu gốc.");
    thongBao("");
    ve();
  }

  function kiemTra() {
    if (!buoi || buoi.xong) return;
    const q = buoi.ds[buoi.i];
    if (buoi.chon.length !== q.manh.length) return;
    const cau = buoi.chon.map((id) => q.manh[id].text).join("");
    if (cau !== q.cau) {
      thongBao(T("Chưa đúng. Chạm mảnh trong câu để đổi chỗ rồi thử lại."), "sai");
      return;
    }
    buoi.xong = true;
    buoi.dung++;
    thongBao(T("Đúng rồi!"), "dung");
    ve();
  }

  function boQua() {
    if (!buoi || buoi.xong) return;
    buoi.xong = true;
    thongBao(T2("Câu gốc: {cau}", { cau: buoi.ds[buoi.i].cau }), "dap-an");
    ve();
  }

  function tiep() {
    if (!buoi || !buoi.xong) return;
    buoi.i++;
    buoi.chon = [];
    buoi.xong = false;
    thongBao("");
    ve();
  }

  async function lamMoi() {
    if (!layMuc || !ngonNgu) return;
    if (ngonNgu() !== "ja") {
      tatCa = []; buoi = null;
      $("npCount").textContent = T("Chuyển sang Nhật – Việt để luyện ngữ pháp.");
      ve();
      return;
    }
    try {
      tatCa = goc.NguPhap.danhSach(await layMuc());
      if (!buoi) $("npCount").textContent = tatCa.length
        ? T2("Có {n} câu từ sổ tay để luyện.", { n: tatCa.length })
        : T("Chưa có câu tiếng Nhật đủ ngữ cảnh. Hãy lưu từ trong một câu trọn vẹn hoặc lưu câu từ video.");
    } catch (e) {
      tatCa = [];
      $("npCount").textContent = T("Không đọc được sổ tay. Hãy thử mở lại mục này.");
    }
    ve();
  }

  function khoiTao(cauHinh) {
    layMuc = cauHinh.layMuc;
    ngonNgu = cauHinh.ngonNgu;
    if (!daGan) {
      $("npStart").addEventListener("click", batDau);
      $("npCheck").addEventListener("click", kiemTra);
      $("npSkip").addEventListener("click", boQua);
      $("npNext").addEventListener("click", tiep);
      daGan = true;
    }
  }

  goc.NguPhapUI = { khoiTao, lamMoi };
})(typeof self !== "undefined" ? self : this);
