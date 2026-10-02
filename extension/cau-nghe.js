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
    if(raw && raw.length<=8000 && (raw.includes(tu)||raw.includes(word)) &&
       raw.replace(/[。．.!?！？…\s]/g,"")!==tu.replace(/\s/g,""))
      return {cau:raw,tu:word||tu};
    if(src.yt&&src.yt.v&&tu!==word&&tu.includes(word))return {cau:tu,tu:word};
    return moiNguCanh(src.prefix,src.suffix,tu,{
      contextStart:src.contextStart===true,contextEnd:src.contextEnd===true,max:8000
    });
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
    const thap = cau.toLowerCase();
    const i = thap.length === cau.length ? thap.indexOf(w.toLowerCase()) : cau.indexOf(w);
    return { cau, dich: String(dich).trim(), tu: i >= 0 ? [i, i + w.length] : null };
  }
  goc.CauNghe = { moiCau, moiNguCanh, nguCanh, tuNguon, thatSuKet, cauHopLe, hienThi };
})(typeof self !== "undefined" ? self : this);
