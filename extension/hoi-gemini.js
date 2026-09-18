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
 * Vì sao tự dựng chuỗi chứ không gọi API
 * --------------------------------------
 * Gọi API Gemini thì phải có khoá, mà khoá thì phải cất ở đâu đó và phải trả
 * tiền. Đây là app học từ vựng miễn phí, chạy trên máy người dùng. Mở thẳng
 * gemini.google.com bằng chính tài khoản họ đang đăng nhập là đường duy nhất
 * không đòi hỏi gì thêm.
 *
 * Trần độ dài — chỗ dễ hỏng nhất
 * ------------------------------
 * Câu hỏi đi qua THANH ĐỊA CHỈ (`?q=`), mà tiếng Việt lẫn tiếng Nhật mã hoá ra
 * URL thì mỗi chữ nở thành 9 ký tự ("ả" → %E1%BA%A3). Một câu hỏi 1.200 chữ
 * thành hơn 10.000 ký tự URL — quá ngưỡng máy chủ thường chấp nhận, và lúc đó
 * nó không cắt bớt cho đẹp mà trả về lỗi.
 *
 * Nên phải rút, và rút theo ba nước, đúng thứ tự này:
 *
 *   1. RÚT NGẮN trước. Câu bôi đen là một đoạn văn dài thì cắt bớt nó, chứ
 *      đừng vứt cả câu đi — vứt là mất đúng cái thứ mà cả tính năng này xoay
 *      quanh, trong khi giữ lấy 200 chữ đầu vẫn đủ để hiểu từ nằm ở đâu.
 *   2. BỎ KHỐI, từ ít quan trọng nhất (điểm số, nguồn) trở lên. Mỗi khối mang
 *      một MỨC ƯU TIÊN; mức 0 thì không bao giờ bỏ.
 *   3. Cắt ngang chuỗi — chỉ khi hai nước trên vẫn không đủ, và cắt xong vẫn
 *      phải chừa mấy câu hỏi lại. Cắt đuôi là hỏng nặng nhất: gửi đi một đống
 *      dữ kiện mà không hỏi gì, Gemini vẫn trả lời, vẫn trông như chạy được,
 *      chỉ là nó trả lời một câu hỏi tự đoán ra.
 *
 * Bản ĐẦY ĐỦ vẫn được trả về (`day`) để chỗ gọi chép vào bộ nhớ tạm. Không mất
 * gì: Gemini không tự điền, hay câu hỏi bị rút bớt, thì vẫn còn đường dán tay.
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

  const GOC_URL = "https://gemini.google.com/app";

  /*
   * Trần tính theo ký tự SAU khi mã hoá URL, không phải theo chữ.
   *
   * 7.000 chọn vì đó là chỗ an toàn dưới mức 8 KiB mà phần lớn máy chủ đặt cho
   * dòng yêu cầu HTTP, sau khi đã chừa chỗ cho tên miền và đuôi "/app?q=".
   */
  const TRAN_URL = 7000;

  /* Ưu tiên: số CÀNG LỚN càng bị bỏ trước. Mức 0 thì không bao giờ bỏ. */
  const UU = {
    DE: 0,          // lời mở + chính cái từ
    HOI: 0,         // mấy câu hỏi — bỏ cái này thì đi hỏi làm gì
    NGUCANH: 1,     // câu bôi đen, câu ví dụ: đây là thứ cả tính năng xoay quanh
    NGHIA: 2,       // nghĩa đang có trong sổ
    GHICHU: 3,      // ghi chú tự viết
    LIEN: 4,        // đồng nghĩa / trái nghĩa đã lưu
    NGUON: 5,       // link, tên trang, mốc phút
    CHUHAN: 6,      // on/kun/số nét/JLPT
    ANH: 7,         // định nghĩa tiếng Anh của Free Dictionary
    TIENDO: 8       // điểm và mức thuộc — vui là chính
  };

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
  /** Cắt bớt một chuỗi quá dài, có dấu … để đọc ra là đã bị cắt. */
  function ngan(x, n) {
    const t = sach(x);
    return (!isFinite(n) || t.length <= n) ? t : t.slice(0, n).trim() + "…";
  }

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
   * định nghĩa đầu: đưa cả mảng vào thì riêng nó đã ăn hết trần URL, mà phần
   * đuôi thường là mấy nghĩa hiếm chẳng liên quan tới câu đang hỏi.
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
   * @returns {{day: string, gon: string, cat: boolean}}
   *   `day` bản đầy đủ (để chép vào bộ nhớ tạm), `gon` bản đã lược cho vừa
   *   thanh địa chỉ, `cat` có phải đã lược bớt hay không.
   */
  function loiHoi(muc, phu) {
    const it = muc || {};
    const p = phu || {};
    const loai = loaiCua(it);
    const ten = tenLoai(loai);
    const tu = sach(it.word) || "…";
    const huong = tenHuong(it.dict);

    /*
     * Dựng danh sách khối, với `mc` là mức cắt cho những trường có thể dài.
     * Gọi hai lần: một lần Infinity cho bản đầy đủ, một lần (hoặc vài lần) với
     * mức cắt nhỏ dần cho bản đi qua thanh địa chỉ.
     */
    const dung = function (mc) {
    /* Mỗi phần tử: {uu, chu}. Thứ tự trong mảng LÀ thứ tự in ra. */
    const khoi = [];
    /*
     * `tiep` = dòng này dính liền dòng trên, cách nhau MỘT lần xuống dòng chứ
     * không phải một dòng trống. Mấy dòng trong nhóm "đã lưu sẵn" là một danh
     * sách; giãn mỗi dòng ra một đoạn thì đọc như mười ý rời nhau, mà còn ăn
     * thêm chỗ trong thanh địa chỉ cho một thứ chẳng mang tin gì.
     */
    const them = function (uu, chu, tiep) { if (chu) khoi.push({ uu: uu, chu: chu, tiep: !!tiep }); };

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
    them(UU.DE, dau.join("\n"));

    /* --- ngữ cảnh: phần quan trọng nhất sau chính câu hỏi --- */
    const nc = [];
    const cauBoiDen = ngan((it.src || {}).sel, mc);
    // Mục là một CÂU thì chính nó đã là ngữ cảnh rồi; nhắc lại y nguyên là thừa.
    if (cauBoiDen && cauBoiDen !== tu) {
      nc.push(T("Câu tôi bôi đen lúc lưu:"));
      nc.push("「" + cauBoiDen + "」");
    }
    const cauNghe = ngan((it.cauNghe || {}).cau, mc);
    if (cauNghe && cauNghe !== cauBoiDen && cauNghe !== tu) {
      nc.push(T("Câu ví dụ app đã lưu để luyện nghe:"));
      nc.push("「" + cauNghe + "」");
      const dich = ngan((it.cauNghe || {}).dich, mc);
      if (dich) nc.push(T2("(bản dịch đang có: {dich})", { dich: dich }));
    }
    if (nc.length) them(UU.NGUCANH, T("--- NGỮ CẢNH TÔI ĐÃ GẶP ---") + "\n" + nc.join("\n"));
    const coNguCanh = nc.length > 0 || loai === "cau";

    /* --- những gì sổ tay đang giữ --- */
    const daLuu = [];
    const nghia = dsChu(it.means);
    if (nghia.length) {
      daLuu.push({ uu: UU.NGHIA, chu: T2("Nghĩa đang có trong sổ: {nghia}", { nghia: ngan(nghia.join("; "), mc) }) });
      if (it.mEdit) {
        const goc = dsChu(it.mOrig);
        daLuu.push({ uu: UU.NGHIA, chu: goc.length
          ? T2("(nghĩa trên do CHÍNH TÔI sửa lại; bản máy dịch ban đầu là: {goc})", { goc: ngan(goc.join("; "), mc) })
          : T("(nghĩa trên do CHÍNH TÔI sửa lại, không phải bản máy dịch)") });
      }
    }
    if (it.note && sach(it.note)) {
      daLuu.push({ uu: UU.GHICHU, chu: T2("Ghi chú tôi tự viết: {gc}", { gc: ngan(it.note, mc) }) });
    }
    const dong = dsChu((it.lien || {}).dong);
    const trai = dsChu((it.lien || {}).trai);
    if (dong.length) daLuu.push({ uu: UU.LIEN, chu: T2("Đồng nghĩa tôi đã lưu: {ds}", { ds: ngan(dong.join(", "), mc) }) });
    if (trai.length) daLuu.push({ uu: UU.LIEN, chu: T2("Trái nghĩa tôi đã lưu: {ds}", { ds: ngan(trai.join(", "), mc) }) });
    if (p.chuHan) daLuu.push({ uu: UU.CHUHAN, chu: T2("Chữ Hán: {meta}", { meta: ngan(p.chuHan, mc) }) });
    const anh = dongAnh(it.pos);
    if (anh.length) daLuu.push({ uu: UU.ANH, chu: T2("Định nghĩa tiếng Anh app đã lưu: {ds}", { ds: ngan(anh.join(" | "), mc) }) });
    if (p.so) daLuu.push({ uu: UU.TIENDO, chu: T2("Nằm trong sổ con: {so}", { so: sach(p.so) }) });
    if (p.diem && isFinite(p.diem.tong)) {
      daLuu.push({ uu: UU.TIENDO, chu: T2("Mức thuộc hiện tại của tôi: {d}/100 — {ten}",
                                          { d: p.diem.tong, ten: p.diem.ten || "" }) });
    }

    /*
     * Nguồn đi CUỐI phần dữ kiện, không đi cùng ngữ cảnh.
     *
     * Đường link không giúp Gemini hiểu từ — nó không mở được trang ấy. Chỗ nó
     * có ích là khi câu bôi đen bị cụt: "phút 3:47 của video dạy nấu ăn" cũng
     * đã đủ để đoán ra đây là nghĩa thường ngày chứ không phải nghĩa chuyên môn.
     */
    const src = it.src || {};
    if (src.url) {
      const yt = src.yt || {};
      // Đường link đi kèm CẢ ở nhánh video. Gemini không mở được nó, nhưng
      // người học thì mở — và câu trả lời thường làm họ muốn nghe lại đúng chỗ
      // ấy. Cắt link ra khỏi đây là bắt họ quay về app mò lại.
      const md = yt.v
        ? T2("YouTube · phút {t}{kenh} — {ten} ({url})", {
            t: giay(yt.t), kenh: yt.kenh ? " · " + ngan(yt.kenh, mc) : "",
            ten: ngan(src.title, mc) || T("(không có tên)"), url: sach(src.url) })
        : (sach(src.title) ? ngan(src.title, mc) + " — " + sach(src.url) : sach(src.url));
      daLuu.push({ uu: UU.NGUON, chu: T2("Tôi lưu nó từ: {nguon}", { nguon: md }) });
    }

    if (daLuu.length) {
      /*
       * Phần này được nhóm lại nhưng KHÔNG gộp thành một khối.
       *
       * Gộp thì lúc vượt trần phải bỏ trọn cả nhóm — mất luôn nghĩa chỉ vì
       * mấy dòng định nghĩa tiếng Anh dài. Để rời thì bỏ đúng dòng đáng bỏ.
       * Cái tiêu đề thì mang ưu tiên của dòng dễ sống nhất trong nhóm, để
       * không bao giờ còn trơ lại một tiêu đề không có gì bên dưới.
       */
      let nhoNhat = Infinity;
      for (const d of daLuu) nhoNhat = Math.min(nhoNhat, d.uu);
      them(nhoNhat, T("--- TÔI ĐÃ LƯU SẴN NHỮNG THỨ NÀY ---"));
      for (const d of daLuu) them(d.uu, d.chu, true);
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
    them(UU.HOI, hoi.join("\n"));
    return khoi;
    };

    const noi = function (ds) {
      let r = "";
      ds.forEach(function (k, i) { r += (i ? (k.tiep ? "\n" : "\n\n") : "") + k.chu; });
      return r;
    };
    const qua = function (ds) { return encodeURIComponent(noi(ds)).length > TRAN_URL; };
    const day = noi(dung(Infinity));

    /*
     * Nước 1 — RÚT NGẮN. Thử các mức cắt nhỏ dần cho tới khi vừa trần.
     *
     * Đây là nước đi trước, không phải nước cuối: mục vượt trần gần như luôn là
     * mục có một trường dài bất thường (bôi đen cả đoạn văn rồi bấm Lưu), chứ
     * không phải mục có nhiều thứ. Cắt đúng cái trường ấy thì mọi khối khác còn
     * nguyên — mà "còn nguyên" mới là thứ người ta đang cần ở tính năng này.
     */
    let con = dung(Infinity);
    for (const m of [1200, 600, 300, 150, 80]) {
      if (!qua(con)) break;
      con = dung(m);
    }

    /* Nước 2 — BỎ KHỐI, từ ưu tiên lớn nhất xuống. Mức 0 thì không bao giờ bỏ. */
    while (qua(con)) {
      let max = -1;
      for (const k of con) max = Math.max(max, k.uu);
      if (max <= 0) break;
      con = con.filter(function (k) { return k.uu < max; });
    }

    /*
     * Nước 3 — cắt ngang chuỗi. Chỉ tới đây khi hai nước trên vẫn không đủ, và
     * cắt ở ĐẦU chứ không cắt đuôi: đuôi là mấy câu hỏi, mất nó thì gửi đi một
     * đống dữ kiện mà chẳng hỏi gì.
     */
    let gon = noi(con);
    if (encodeURIComponent(gon).length > TRAN_URL) {
      const cuoi = con.length ? con[con.length - 1].chu : "";
      const chua = TRAN_URL - encodeURIComponent(cuoi + "\n…\n\n").length;
      let n = gon.length;
      while (n > 200 && encodeURIComponent(gon.slice(0, n)).length > chua) n -= 100;
      gon = gon.slice(0, Math.max(200, n)) + "\n…\n\n" + cuoi;
    }

    // `cat` là "bản gửi đi KHÁC bản đầy đủ", tính bằng cách so chứ không bằng
    // cách đánh dấu dọc đường: đánh dấu thì mỗi lần thêm một nước rút mới lại
    // phải nhớ cắm cờ, mà quên cắm thì màn hình im lặng nói dối là không mất gì.
    return { day: day, gon: gon, cat: gon !== day };
  }

  /** Đường dẫn mở Gemini với câu hỏi điền sẵn. */
  function diaChi(loi) {
    return GOC_URL + "?q=" + encodeURIComponent(String(loi == null ? "" : loi));
  }

  goc.HoiGemini = {
    GOC_URL: GOC_URL, TRAN_URL: TRAN_URL, UU: UU,
    loiHoi: loiHoi, diaChi: diaChi, loaiCua: loaiCua
  };
})(typeof self !== "undefined" ? self : this);
