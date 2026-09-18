/**
 * HỎI GEMINI VỀ MỘT MỤC — dựng sẵn câu hỏi, kèm ĐỦ những gì sổ tay đã lưu.
 * ===========================================================================
 *
 * Vì sao có tệp này
 * -----------------
 * Nghĩa trong sổ tay là nghĩa RỜI: "改善 = cải thiện". Nhưng cái người học vấp
 * phải không phải nghĩa rời, mà là "trong ĐÚNG câu này thì nó đang nói gì" —
 * sắc thái, mức trang trọng, vì sao ở đây dùng từ này chứ không phải từ gần
 * nghĩa ngay bên cạnh. Từ điển không trả lời được; một mô hình ngôn ngữ thì có,
 * NẾU nó được đưa cho cái ngữ cảnh ấy.
 *
 * Mà ngữ cảnh ấy thì app đang giữ sẵn: câu bôi đen lúc lưu, câu ví dụ dựng cho
 * bài nghe, đường link và mốc phút video, tập đồng/trái nghĩa, ghi chú riêng,
 * bản dịch người học tự sửa. Gõ tay lại từng ấy thứ vào ô chat thì không ai gõ
 * — nên việc nào máy làm được thì máy làm.
 *
 * Đường đi của câu hỏi: BỘ NHỚ TẠM, không phải thanh địa chỉ
 * ---------------------------------------------------------
 * Bản đầu gửi câu hỏi qua `?q=` trên đường dẫn. ĐO THẬT thì không chạy:
 * gemini.google.com nạp đúng đường dẫn ấy nhưng ô chat vẫn trống trơn — Google
 * không đọc tham số đó (nữa). Mà hỏng theo kiểu im lặng: trang mở ra bình
 * thường, không báo lỗi gì, người dùng chỉ thấy một ô trống và tưởng nút hỏng.
 *
 * Nên đổi hẳn sang bộ nhớ tạm: bấm nút là chép câu hỏi, mở Gemini, rồi người
 * học bấm Ctrl+V. Thêm đúng MỘT thao tác, đổi lại thì chắc chắn chạy, và không
 * còn phụ thuộc vào một tính năng của bên thứ ba có thể tắt lúc nào không hay.
 *
 * Được thêm: bộ nhớ tạm không có trần độ dài như đường dẫn. Bản `?q=` phải cắt
 * gọt ba nước cho vừa 7.000 ký tự (tiếng Việt lẫn tiếng Nhật mã hoá ra URL thì
 * mỗi chữ nở thành 9 ký tự). Giờ bỏ sạch phần ấy — câu hỏi đi ĐỦ, không cắt
 * dòng nào. Và lịch sử trình duyệt không còn dính nguyên câu hỏi trong URL.
 */
(function (goc) {
  "use strict";

  const T = function (s) { return goc.T ? goc.T(s) : s; };
  const T2 = function (s, o) {
    if (goc.T2) return goc.T2(s, o);
    let r = s;
    for (const k in (o || {})) r = r.split("{" + k + "}").join(o[k]);
    return r;
  };

  /* Trang chat trơn. Không kèm tham số nào — xem khối chú thích trên. */
  const GOC_URL = "https://gemini.google.com/app";

  /** "227" -> "3:47". */
  function giay(t) {
    const s = Math.max(0, Math.round(Number(t) || 0));
    const p = Math.floor(s / 60), g = s % 60;
    return p + ":" + (g < 10 ? "0" : "") + g;
  }

  function sach(x) { return String(x == null ? "" : x).replace(/\s+/g, " ").trim(); }

  /*
   * Đọc một trường ĐÁNG RA là mảng.
   *
   * Không phải phòng xa vu vơ: `means` và `lien.dong` đi qua đường nạp CSV,
   * đường đồng bộ Drive và cả sổ của máy khác — chỉ cần một bên ghi ra chuỗi
   * thay vì mảng là chỗ này nổ. Mà nổ ở đây thì cả nút hỏi im re, trong khi
   * mục ấy nhìn vẫn bình thường trên màn hình.
   */
  function dsChu(x) {
    if (!Array.isArray(x)) return x == null || x === "" ? [] : [sach(x)].filter(Boolean);
    return x.map(sach).filter(Boolean);
  }

  /** Một mục là TỪ, CÂU hay CHỮ HÁN — cách hỏi mỗi loại một khác. */
  function loaiCua(muc) {
    if (!muc) return "tu";
    if (muc.dict === "kanji") return "han";
    if (muc.kind === "sent") return "cau";
    return "tu";
  }

  function tenLoai(l) {
    if (l === "han") return T("chữ Hán");
    if (l === "cau") return T("câu");
    return T("từ");
  }

  function tenHuong(d) {
    if (d === "kanji") return T("Hán tự");
    if (d === "javi") return T("Nhật→Việt");
    if (d === "vija") return T("Việt→Nhật");
    if (d === "vien") return T("Việt→Anh");
    if (d === "envi") return T("Anh→Việt");
    return "";
  }

  /**
   * Định nghĩa tiếng Anh của Free Dictionary, gói lại cho gọn.
   *
   * `pos` là mảng {p: từ loại, defs: [...], syn: [...]}. Lấy mỗi từ loại một
   * định nghĩa đầu: phần đuôi thường là mấy nghĩa hiếm chẳng liên quan gì tới
   * câu đang hỏi, mà lại đẩy phần câu hỏi trôi xuống quá xa.
   */
  function dongAnh(pos) {
    const ra = [];
    for (const p of (Array.isArray(pos) ? pos : [])) {
      if (!p) continue;
      const d = (p.defs || []).filter(Boolean)[0];
      if (!d) continue;
      ra.push((p.p ? p.p + ": " : "") + sach(d));
      if (ra.length >= 4) break;
    }
    return ra;
  }

  /**
   * Dựng câu hỏi.
   *
   * @param {object} muc  một mục sổ tay, đúng hình dạng đang lưu trong kho.
   * @param {object} [phu] những thứ mô-đun này không tự tính được:
   *   - `hanViet`  âm Hán Việt (notebook.js dựng từ bảng KANJI).
   *   - `chuHan`   dòng on/kun/số nét/JLPT (window.HanTu.META).
   *   - `diem`     {tong, ten} từ window.Srs.diemTu.
   *   - `so`       tên sổ con.
   * @returns {string} câu hỏi ĐẦY ĐỦ, để chép vào bộ nhớ tạm.
   */
  function loiHoi(muc, phu) {
    const it = muc || {};
    const p = phu || {};
    const loai = loaiCua(it);
    const ten = tenLoai(loai);
    const tu = sach(it.word) || "…";
    const huong = tenHuong(it.dict);

    /*
     * Mỗi phần tử: {chu, tiep}. Thứ tự trong mảng LÀ thứ tự in ra.
     *
     * `tiep` = dòng này dính liền dòng trên, cách nhau MỘT lần xuống dòng chứ
     * không phải một dòng trống. Mấy dòng trong nhóm "đã lưu sẵn" là một danh
     * sách; giãn mỗi dòng ra thành một đoạn thì đọc như mười ý rời nhau.
     */
    const khoi = [];
    const them = function (chu, tiep) { if (chu) khoi.push({ chu: chu, tiep: !!tiep }); };

    /* --- lời mở --- */
    const dau = [];
    dau.push(huong
      ? T2("Tôi đang học từ vựng ({huong}) bằng app NeutronDict.", { huong: huong })
      : T("Tôi đang học từ vựng bằng app NeutronDict."));
    dau.push(T2("Tôi muốn hiểu cho đúng {loai} dưới đây, TRONG ĐÚNG NGỮ CẢNH tôi đã gặp nó.",
                { loai: ten }));
    dau.push("");
    dau.push(T2("{Loai} cần hỏi: {tu}", { Loai: ten.charAt(0).toUpperCase() + ten.slice(1), tu: tu }));
    if (it.reading) dau.push(T2("Cách đọc: {doc}", { doc: sach(it.reading) })
      + (it.docSuy ? " " + T("(app suy ra từ phiên âm, có thể chưa chuẩn)") : ""));
    if (p.hanViet) dau.push(T2("Âm Hán Việt: {am}", { am: sach(p.hanViet) }));
    them(dau.join("\n"));

    /* --- ngữ cảnh: phần quan trọng nhất sau chính mấy câu hỏi --- */
    const nc = [];
    const cauBoiDen = sach((it.src || {}).sel);
    // Mục là một CÂU thì chính nó đã là ngữ cảnh rồi; nhắc lại y nguyên là thừa.
    if (cauBoiDen && cauBoiDen !== tu) {
      nc.push(T("Câu tôi bôi đen lúc lưu:"));
      nc.push("「" + cauBoiDen + "」");
    }
    const cauNghe = sach((it.cauNghe || {}).cau);
    if (cauNghe && cauNghe !== cauBoiDen && cauNghe !== tu) {
      nc.push(T("Câu ví dụ app đã lưu để luyện nghe:"));
      nc.push("「" + cauNghe + "」");
      const dich = sach((it.cauNghe || {}).dich);
      if (dich) nc.push(T2("(bản dịch đang có: {dich})", { dich: dich }));
    }
    if (nc.length) them(T("--- NGỮ CẢNH TÔI ĐÃ GẶP ---") + "\n" + nc.join("\n"));
    const coNguCanh = nc.length > 0 || loai === "cau";

    /* --- những gì sổ tay đang giữ --- */
    const daLuu = [];
    const nghia = dsChu(it.means);
    if (nghia.length) {
      daLuu.push(T2("Nghĩa đang có trong sổ: {nghia}", { nghia: nghia.join("; ") }));
      if (it.mEdit) {
        const g = dsChu(it.mOrig);
        daLuu.push(g.length
          ? T2("(nghĩa trên do CHÍNH TÔI sửa lại; bản máy dịch ban đầu là: {goc})", { goc: g.join("; ") })
          : T("(nghĩa trên do CHÍNH TÔI sửa lại, không phải bản máy dịch)"));
      }
    }
    if (it.note && sach(it.note)) daLuu.push(T2("Ghi chú tôi tự viết: {gc}", { gc: sach(it.note) }));
    const dong = dsChu((it.lien || {}).dong);
    const trai = dsChu((it.lien || {}).trai);
    if (dong.length) daLuu.push(T2("Đồng nghĩa tôi đã lưu: {ds}", { ds: dong.join(", ") }));
    if (trai.length) daLuu.push(T2("Trái nghĩa tôi đã lưu: {ds}", { ds: trai.join(", ") }));
    if (p.chuHan) daLuu.push(T2("Chữ Hán: {meta}", { meta: sach(p.chuHan) }));
    const anh = dongAnh(it.pos);
    if (anh.length) daLuu.push(T2("Định nghĩa tiếng Anh app đã lưu: {ds}", { ds: anh.join(" | ") }));
    if (p.so) daLuu.push(T2("Nằm trong sổ con: {so}", { so: sach(p.so) }));
    if (p.diem && isFinite(p.diem.tong)) {
      daLuu.push(T2("Mức thuộc hiện tại của tôi: {d}/100 — {ten}",
                    { d: p.diem.tong, ten: p.diem.ten || "" }));
    }

    /*
     * Nguồn đi CUỐI phần dữ kiện, không đi cùng ngữ cảnh.
     *
     * Đường link không giúp Gemini hiểu từ — nó không mở được trang ấy. Chỗ nó
     * có ích là khi câu bôi đen bị cụt: "phút 3:47 của video dạy nấu ăn" cũng
     * đã đủ để đoán ra đây là nghĩa thường ngày chứ không phải nghĩa chuyên môn.
     * Và chính người học thì mở được — câu trả lời thường làm họ muốn nghe lại
     * đúng chỗ ấy, nên cắt link ra là bắt họ quay về app mò lại.
     */
    const src = it.src || {};
    if (src.url) {
      const yt = src.yt || {};
      const md = yt.v
        ? T2("YouTube · phút {t}{kenh} — {ten} ({url})", {
            t: giay(yt.t), kenh: yt.kenh ? " · " + sach(yt.kenh) : "",
            ten: sach(src.title) || T("(không có tên)"), url: sach(src.url) })
        : (sach(src.title) ? sach(src.title) + " — " + sach(src.url) : sach(src.url));
      daLuu.push(T2("Tôi lưu nó từ: {nguon}", { nguon: md }));
    }

    if (daLuu.length) {
      them(T("--- TÔI ĐÃ LƯU SẴN NHỮNG THỨ NÀY ---"));
      for (const d of daLuu) them(d, true);
    }

    /* --- câu hỏi --- */
    const hoi = [T("--- HÃY TRẢ LỜI BẰNG TIẾNG VIỆT ---")];
    if (coNguCanh) {
      hoi.push(T2("1. Trong ĐÚNG câu ngữ cảnh ở trên, {loai} này nghĩa là gì? Dịch cả câu, và nói rõ nó đóng vai trò gì trong câu.", { loai: ten }));
      hoi.push(T("2. Nghĩa tôi đang lưu có khớp với ngữ cảnh đó không? Lệch chỗ nào thì nói thẳng."));
    } else {
      // Không có ngữ cảnh nào thì nói hẳn ra, và đổi câu 1 thành xin một ngữ
      // cảnh điển hình — chứ hỏi "trong ngữ cảnh trên" khi ở trên trống không
      // thì chỉ tổ mời mô hình bịa ra một câu rồi giả vờ đó là câu của tôi.
      hoi.push(T2("(Tôi CHƯA lưu được câu ngữ cảnh nào cho {loai} này — đừng đoán là tôi đã gặp nó ở đâu.)", { loai: ten }));
      hoi.push(T2("1. {Loai} này nghĩa là gì, và nó hay xuất hiện trong kiểu ngữ cảnh nào? Cho một câu điển hình có dịch.", { Loai: ten.charAt(0).toUpperCase() + ten.slice(1) }));
      hoi.push(T("2. Nghĩa tôi đang lưu có sát không? Lệch chỗ nào thì nói thẳng."));
    }
    hoi.push(T("3. Sắc thái và mức trang trọng: lúc nào dùng được, lúc nào KHÔNG nên dùng."));
    if (dong.length || trai.length) {
      hoi.push(T("4. Phân biệt với những từ tôi đã lưu ở trên — mỗi từ một câu ngắn, chỉ ra chỗ khác nhau thật sự."));
    } else {
      hoi.push(T2("4. Những {loai} nào gần nghĩa mà hay bị dùng nhầm chỗ? Phân biệt giúp tôi.", { loai: ten }));
    }
    hoi.push(T("5. Hai ví dụ khác cùng sắc thái, có dịch."));
    hoi.push(T("6. Một mẹo ngắn để tôi nhớ được lâu."));
    hoi.push("");
    hoi.push(T("Trả lời gọn. Đừng chép lại những gì tôi vừa đưa."));
    them(hoi.join("\n"));

    let r = "";
    khoi.forEach(function (k, i) { r += (i ? (k.tiep ? "\n" : "\n\n") : "") + k.chu; });
    return r;
  }

  goc.HoiGemini = { GOC_URL: GOC_URL, loiHoi: loiHoi, loaiCua: loaiCua };
})(typeof self !== "undefined" ? self : this);
