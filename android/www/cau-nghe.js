/**
 * Câu ngữ cảnh cho bài kiểm tra NGHE.
 * ===========================================================================
 *
 * Lúc lưu một từ, app đã cất sẵn vài chục ký tự trước và sau chỗ bôi đen
 * (`src.prefix` / `src.suffix` — xem pageSrc trong content.js). Cộng lại thì đó
 * là đoạn văn quanh từ, nhưng nó bị CẮT CỤT ở hai đầu: prefix bắt đầu giữa
 * chừng một câu, suffix kết thúc giữa chừng câu sau.
 *
 * Việc của tệp này: từ đoạn cụt ấy, moi ra ĐÚNG MỘT CÂU TRỌN VẸN chứa từ.
 *
 * Vì sao phải trọn vẹn
 * --------------------
 * Bài nghe mà cho nghe nửa câu thì người học không có gì để bám. Ngữ pháp tiếng
 * Nhật dồn thông tin về cuối câu — nghe "業務を改善する必要が" rồi cắt là mất đúng
 * phần nói lên thái độ người nói. Thà bỏ qua một mục còn hơn dựng một câu cụt.
 *
 * Cắt ở đâu
 * ---------
 * Ở dấu kết câu: 。．.!?！？ và xuống dòng. Có hai cái bẫy ai làm cũng dính:
 *
 *   • Dấu chấm trong con số và chữ viết tắt — "3.5", "Mr. Tanaka", "U.S." —
 *     không phải hết câu.
 *   • Dấu đóng ngoặc/ngoặc kép đi SAU dấu chấm vẫn thuộc về câu đó: 「…です。」
 *
 * Và cái bẫy thứ ba, chỉ lộ ra khi dùng thật: nếu prefix bị cắt cụt giữa chừng
 * mà trong nó KHÔNG có dấu kết nào, thì "câu" moi ra sẽ bắt đầu từ chỗ cụt.
 * Trường hợp đó phải nói thẳng là không dựng được, chứ không im lặng trả về một
 * câu thiếu đầu.
 */
(function (goc) {
  "use strict";

  /** Dấu kết câu. */
  const KET = /[。．.!?！？…\n\r]/;
  /** Dấu đóng đi kèm sau dấu kết thì vẫn thuộc câu đó. */
  const DONG = /[」』）)\]】”"'、]/;

  /**
   * Dấu chấm ở vị trí này có thật là hết câu không.
   * @param {string} s cả đoạn
   * @param {number} i vị trí dấu
   */
  function thatSuKet(s, i) {
    const c = s[i];
    if (c === "\n" || c === "\r") return true;
    if (c !== ".") return true;                       // 。！？ thì luôn là kết
    const truoc = s[i - 1] || "", sau = s[i + 1] || "";
    if (/[0-9]/.test(truoc) && /[0-9]/.test(sau)) return false;   // 3.5
    if (/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc)$/i.test(s.slice(0,i))) return false;
    // "Mr." / "U.S." — một chữ cái hoa đứng ngay trước dấu chấm
    if (/[A-Z]/.test(truoc) && (!s[i - 2] || !/[a-z]/.test(s[i - 2]))) return false;
    return true;
  }

  /**
   * Moi câu trọn vẹn chứa `tu` ra khỏi `truoc + tu + sau`.
   *
   * @param {string} truoc phần trước chỗ bôi đen (có thể cụt đầu)
   * @param {string} tu    chính chữ đã bôi
   * @param {string} sau   phần sau chỗ bôi đen (có thể cụt đuôi)
   * @returns {{cau:string, tu:string}|null} null = không dựng được câu trọn vẹn
   */
  function moiNguCanh(truoc, sau, tu, opt) {
    const o = opt || {};
    const p = String(truoc == null ? "" : truoc);
    const t = String(tu == null ? "" : tu);
    const q = String(sau == null ? "" : sau);
    if (!t) return null;
    const ca = p + t + q;
    const dau = p.length, cuoi = p.length + t.length;

    // Lùi về dấu kết gần nhất TRƯỚC từ.
    let d = -1;
    for (let i = dau - 1; i >= 0; i--) if (KET.test(ca[i]) && thatSuKet(ca, i)) { d = i; break; }
    // Không thấy dấu kết nào ở phần trước: chỉ chấp nhận khi phần trước NGẮN
    // (tức là nó vốn là đầu đoạn, không phải bị cắt cụt).
    if (d < 0 && p.length >= 60 && !o.contextStart) return null;
    let batDau = d + 1;
    while (batDau < ca.length && /[\s　]/.test(ca[batDau])) batDau++;

    // Tiến tới dấu kết gần nhất SAU từ.
    let c = -1;
    for (let i = cuoi; i < ca.length; i++) if (KET.test(ca[i]) && thatSuKet(ca, i)) { c = i; break; }
    if (c < 0 && !o.contextEnd) return null;
    let ketThuc = c < 0 ? ca.length : c + 1;
    while (ketThuc < ca.length && DONG.test(ca[ketThuc])) ketThuc++;

    const cau = ca.slice(batDau, ketThuc).replace(/\s+/g, " ").trim();
    if (!cau || cau.indexOf(t) < 0) return null;
    // Câu chỉ đúng bằng cái từ thì chẳng thêm ngữ cảnh nào.
    if (cau.replace(/[。．.!?！？\s]/g, "") === t.replace(/\s/g, "")) return null;
    if (cau.length > (o.max || 8000)) return null;
    return { cau: cau, tu: t };
  }

  /*
   * LỌC TIẾNG VIỆT LẪN VÀO CÂU VÍ DỤ.
   *
   * Tài liệu song ngữ (PDF Nhật–Việt, trang web có chú thích tiếng Việt) làm câu
   * moi ra dính cả nửa tiếng Việt. Bài nghe đọc nguyên câu đó bằng giọng Anh/Nhật
   * còn bài điền khuyết thì hỏi bằng chính bản dịch — ví dụ lẫn tiếng Việt hỏng cả hai.
   *
   * Nhận ra tiếng Việt bằng những chữ CHỈ tiếng Việt mới có (ă ơ ư đ và các nguyên âm
   * mang dấu thanh ả ạ ằ ế ể… ). Chữ như à á é ò có cả ở tiếng Pháp/Bồ nên không dùng làm
   * dấu hiệu. Tiếng Việt viết không dấu thì chịu — không có gì để nhận ra.
   */
  const VIET = /[ăđơưĂĐƠƯảãạằắẳẵặầấẩẫậẻẽẹềếểễệỉĩịỏõọồốổỗộờớởỡợủũụừứửữựỳỷỹỵẢÃẠẰẮẲẴẶẦẤẨẪẬẺẼẸỀẾỂỄỆỈĨỊỎÕỌỒỐỔỖỘỜỚỞỠỢỦŨỤỪỨỬỮỰỲỶỸỴ]/;
  // Chữ có cả ở tiếng Pháp/Bồ: không đủ để kết luận một chữ là tiếng Việt, nhưng khi câu
  // ĐÃ bị nghi lẫn thì dùng làm chỗ dừng khi cắt ("Máy cắt…" đứng sát phần tiếng Anh).
  const YEU = /[àáâèéêìíòóôùúýÀÁÂÈÉÊÌÍÒÓÔÙÚÝ]/;
  const CUOI_CAU = /[。．.!?！？…」』]$/;

  function coTiengViet(s) { return VIET.test(String(s || "")); }

  /**
   * Bỏ phần tiếng Việt khỏi câu ví dụ, giữ đoạn chứa `word`.
   *
   * Cắt ở token (chữ cách nhau bằng dấu cách) có chữ riêng của tiếng Việt, hoặc ở dấu
   * kết câu. Không chắc chắn thì KHÔNG đoán: trả `lan:true` và giữ nguyên câu, để
   * giao diện báo người dùng mở ra sửa tay.
   *
   * @returns {{cau:string, lan:boolean, doi:boolean}}
   *   lan = vẫn còn tiếng Việt mà không lọc được · doi = câu đã được lọc
   */
  function lamSach(cau, word) {
    const goc = String(cau || "").replace(/\s+/g, " ").trim();
    if (!VIET.test(goc)) return { cau: goc, lan: false, doi: false };
    const w = String(word || "").trim();
    // "...です。Điện áp..." — dính liền sau dấu kết câu thì tách ra để cắt được.
    const s = goc.replace(/([。！？.!?」』])(?=[A-Za-zĐđ])/g, "$1 ");
    const tok = [], vt = [];
    s.replace(/\S+/g, (t, i) => { tok.push(t); vt.push(i); return t; });
    const dau = w ? s.toLowerCase().indexOf(w.toLowerCase()) : -1;
    if (dau < 0) return { cau: goc, lan: true, doi: false };
    const cuoi = dau + w.length;
    let l = -1, r = -1;
    for (let i = 0; i < tok.length; i++) {
      const a = vt[i], b = vt[i] + tok[i].length;
      if (b > dau && a < cuoi) { if (l < 0) l = i; r = i; }
    }
    if (l < 0) return { cau: goc, lan: true, doi: false };
    for (let i = l; i <= r; i++) if (VIET.test(tok[i])) return { cau: goc, lan: true, doi: false };
    while (l > 0 && !VIET.test(tok[l - 1]) && !YEU.test(tok[l - 1]) && !CUOI_CAU.test(tok[l - 1])) l--;
    while (r < tok.length - 1 && !CUOI_CAU.test(tok[r]) && !VIET.test(tok[r + 1]) && !YEU.test(tok[r + 1])) r++;
    const kq = tok.slice(l, r + 1).join(" ").trim();
    if (!kq || VIET.test(kq) || kq.toLowerCase().indexOf(w.toLowerCase()) < 0
        || kq.replace(/[。．.!?！？…\s]/g, "") === w.replace(/\s/g, "")) return { cau: goc, lan: true, doi: false };
    return { cau: kq, lan: false, doi: kq !== goc };
  }

  /**
   * Dựng câu nghe từ phần `src` của một mục sổ tay.
   * @returns {{cau:string, tu:string}|null}
   */
  function moiCau(truoc,sau,tu) {
    return moiNguCanh(truoc,sau,tu,{max:220});
  }
  function nguCanh(src,word) {
    if(!src)return null;
    const tu=String(src.sel||word||"").trim();
    const raw=String(src.cau||"").replace(/\s+/g," ").trim();
    let kq=null;
    if(raw && raw.length<=8000 && (raw.includes(tu)||raw.includes(word)) &&
       raw.replace(/[。．.!?！？…\s]/g,"")!==tu.replace(/\s/g,""))
      kq={cau:raw,tu:word||tu};
    else if(src.yt&&src.yt.v&&tu!==word&&tu.includes(word))kq={cau:tu,tu:word};
    else kq=moiNguCanh(src.prefix,src.suffix,tu,{
      contextStart:src.contextStart===true,contextEnd:src.contextEnd===true,max:8000
    });
    // Ví dụ lẫn tiếng Việt: lọc ra phần của từ; lọc không được thì giữ nguyên để
    // người dùng thấy và sửa tay (xem hienThi), chứ không im lặng nuốt mất ví dụ.
    if(kq&&VIET.test(kq.cau)){const sach=lamSach(kq.cau,kq.tu||word);if(sach.doi)kq=Object.assign({},kq,{cau:sach.cau});}
    return kq;
  }
  function tuNguon(src,word) {
    const context=nguCanh(src,word);
    // Retain the existing transcript behaviour; ordinary source sentences have a listening limit.
    if(!context)return null;
    if(context.cau.length<=220)return context;
    // Legacy transcript entries stored the complete cue in sel instead of cau.
    // A long new source with sel equal to the selected word must NOT create a new listening exercise.
    if(src.yt&&src.yt.v&&src.sel&&src.sel!==word&&src.sel.includes(word)){
      return {cau:String(src.sel).replace(/\s+/g," ").trim(),tu:word};
    }
    return null;
  }

  function cauHopLe(raw, word) {
    const cau = String(raw || "").replace(/\s+/g, " ").trim();
    const tu = String(word || "").trim();
    if (!tu || !cau.includes(tu) || cau.length > 220 ||
        cau.replace(/[。．.!?！？\s]/g, "") === tu.replace(/\s/g, "")) return "";
    return cau;
  }

  /**
   * Dữ liệu để HIỂN THỊ ngữ cảnh của một mục sổ tay: câu chứa từ, bản dịch của
   * câu, và vị trí của từ trong câu (để tô đậm).
   *
   * Khác `tuNguon`: cái kia chọn câu cho BÀI NGHE nên khắt khe (≤220 chữ, bỏ cả
   * câu cụt). Ở đây chỉ cần cho người học THẤY từ ấy đã gặp trong câu nào, nên
   * lấy câu đã moi sẵn (`cauNghe.cau`), không có thì lấy ngữ cảnh gốc `src` —
   * hiện được là hiện, miễn là không dài tới mức thành cả đoạn văn.
   *
   * Bản dịch lấy ở `cauNghe.dich`, hoặc `src.cauDich` với câu không đủ điều kiện
   * làm bài nghe. Trả null khi không có câu nào đáng hiện (mục là CÂU thì khỏi:
   * chữ của nó đã là câu rồi).
   *
   * @returns {{cau:string, dich:string, tu:?number[]}|null}
   */
  function hienThi(it) {
    if (!it || it.del || it.kind === "sent") return null;
    const w = String(it.word || "").trim();
    if (!w) return null;
    // Người dùng đã tự xoá ví dụ: tôn trọng, đừng moi lại từ nguồn.
    if (it.cauNghe && it.cauNghe.sua && !it.cauNghe.cau) return null;
    let cau = (it.cauNghe && it.cauNghe.cau) ? String(it.cauNghe.cau) : "";
    if (!cau && it.src) {
      let c = null;
      try { c = nguCanh(it.src, w); } catch (e) { c = null; }
      cau = (c && c.cau) || String(it.src.cau || "");
    }
    cau = cau.replace(/\s+/g, " ").trim();
    if (!cau || cau.length > 600) return null;
    if (cau.replace(/[。．.!?！？…\s]/g, "") === w.replace(/\s/g, "")) return null;
    let dich = "";
    if (it.cauNghe && it.cauNghe.dich && String(it.cauNghe.cau).replace(/\s+/g, " ").trim() === cau) dich = it.cauNghe.dich;
    else if (it.src && it.src.cauDich) dich = it.src.cauDich;
    // Ví dụ máy moi mà lẫn tiếng Việt: lọc lúc hiển thị; lọc không được thì báo `lan`.
    // Bản người dùng tự sửa (`sua`) thì giữ nguyên, không lọc lại.
    let lan = false;
    if (!(it.cauNghe && it.cauNghe.sua) && VIET.test(cau)) {
      const sach = lamSach(cau, w);
      if (sach.doi) { cau = sach.cau; dich = ""; }
      lan = sach.lan;
    }
    const thap = cau.toLowerCase();
    const i = thap.length === cau.length ? thap.indexOf(w.toLowerCase()) : cau.indexOf(w);
    return { cau, dich: String(dich).trim(), tu: i >= 0 ? [i, i + w.length] : null, lan: lan, sua: !!(it.cauNghe && it.cauNghe.sua) };
  }

  /*
   * CÁC TỪ CÙNG NGỮ CẢNH CHỈ CẦN MỘT BÀI NGHE.
   *
   * Bôi hai ba từ sát nhau trong cùng một câu thì mỗi từ đều có `cauNghe` giống hệt
   * nhau, tức là một buổi học có ba thẻ nghe CÙNG MỘT CÂU — nghe đi nghe lại, mà bài
   * chẳng kiểm thêm được gì. Gom chúng thành một nhóm: một từ ĐẠI DIỆN giữ đường
   * nghe, các từ còn lại mang `nheChung = khoá của đại diện` và `Srs.duongCo` bỏ
   * đường nghe của chúng (như một mục không có câu nghe).
   *
   * Cùng ngữ cảnh = cùng nguồn (cùng URL/video) VÀ câu này nằm trong câu kia (hoặc
   * giống hệt): hai lần bôi cùng một đoạn văn thường cắt câu hơi lệch nhau. Không
   * rõ nguồn thì không gộp — thà thừa một bài còn hơn nuốt nhầm bài của câu khác.
   *
   * Đại diện chọn theo thứ tự: từ ĐÃ có tiến độ nghe cao nhất (không mất công đã học),
   * rồi khoá nhỏ nhất. Cả hai đều không đổi khi sửa nghĩa/ghi chú, nên đại diện không
   * nhảy qua nhảy lại giữa các lần tính — và máy nào tính cũng ra cùng kết quả.
   */
  function chuanCau(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  function nguonId(it) {
    const s = (it && it.src) || {};
    if (s.yt && s.yt.v) return "yt:" + s.yt.v;
    if (s.url) return "u:" + String(s.url).split("#")[0];
    return "";
  }
  /**
   * @param {Array<object>} ds các mục, MỖI MỤC CÓ `key`
   * @returns {Map<string,string>} khoá của từ phụ -> khoá của từ đại diện
   */
  function nhomChung(ds) {
    const theoNguon = new Map();
    for (const it of (ds || [])) {
      if (!it || !it.key || it.del || it.kind === "sent") continue;
      const cau = chuanCau(it.cauNghe && it.cauNghe.cau);
      const id = nguonId(it);
      if (!cau || !id) continue;
      if (!theoNguon.has(id)) theoNguon.set(id, []);
      theoNguon.get(id).push({ it, cau });
    }
    const phu = new Map();
    for (const mang of theoNguon.values()) {
      if (mang.length < 2) continue;
      mang.sort((a, b) => b.cau.length - a.cau.length || (a.it.key < b.it.key ? -1 : 1));
      const cum = [], theoCau = new Map();
      for (const m of mang) {
        // Giống hệt thì tra thẳng (O(1)); chỉ khi chưa có mới đi tìm câu CHỨA nó. Một
        // tài liệu có hàng trăm từ cùng nguồn thì đa số rơi vào nhánh nhanh.
        let c = theoCau.get(m.cau) || cum.find((x) => x.cau.includes(m.cau));
        if (c) c.mem.push(m.it);
        else { c = { cau: m.cau, mem: [m.it] }; cum.push(c); theoCau.set(m.cau, c); }
      }
      for (const c of cum) {
        if (c.mem.length < 2) continue;
        const tien = (it) => (((it.duong || {}).nghe || {}).lv) || 0;
        c.mem.sort((a, b) => tien(b) - tien(a) || (a.key < b.key ? -1 : 1));
        const dd = c.mem[0].key;
        for (let i = 1; i < c.mem.length; i++) phu.set(c.mem[i].key, dd);
      }
    }
    return phu;
  }
  /**
   * Đặt/gỡ `nheChung` trên cả sổ cho khớp với `nhomChung`. Không đụng `ts`/`srs`:
   * đây là dữ liệu SUY RA, máy nào cũng tính lại được.
   * @param {object} nb sổ tay { khoá: mục }
   * @param {boolean} [chiDem] true = chỉ đếm số mục sẽ đổi, không sửa gì
   * @returns {number} số mục đổi
   */
  function capNhatNheChung(nb, chiDem) {
    const ds = [];
    for (const k in nb) if (nb[k]) ds.push(Object.assign({ key: k }, nb[k]));
    const phu = nhomChung(ds);
    let doi = 0;
    for (const k in nb) {
      const e = nb[k];
      if (!e) continue;
      const can = phu.get(k) || "";
      if ((e.nheChung || "") === can) continue;
      doi++;
      if (chiDem) continue;
      if (can) e.nheChung = can; else delete e.nheChung;
    }
    return doi;
  }
  /** Hai câu ngữ pháp có cùng ngữ cảnh không: giống hệt, hoặc câu này nằm trong câu kia. */
  function cungNguCanh(a, b) {
    const x = chuanCau(a), y = chuanCau(b);
    return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
  }
  goc.CauNghe = { lamSach, coTiengViet, moiCau, moiNguCanh, nguCanh, tuNguon, thatSuKet, cauHopLe, hienThi, nhomChung, capNhatNheChung, cungNguCanh, nguonId };
})(typeof self !== "undefined" ? self : this);
