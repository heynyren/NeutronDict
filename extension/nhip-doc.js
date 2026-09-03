/**
 * Nhịp đọc — hiệu ứng đọc nhanh cho mặt sau thẻ học, và lời nhắc tập trung.
 * ===========================================================================
 *
 * Vì sao có tệp này
 * -----------------
 * Đọc một câu dài trên thẻ học, mắt hay chạy loang: nhìn cả câu một lúc, nhớ
 * mang máng, tưởng là đã đọc. Cách các app đọc nhanh làm là ngược lại — mỗi
 * lúc chỉ để MỘT cụm nổi lên, mắt không phải tự tìm điểm neo nữa. Ở đây cụm
 * đang tới lượt được phóng to và đổi màu, chạy lần lượt hết câu rồi quay lại
 * từ đầu; tốc độ chỉnh trong Cài đặt.
 *
 * Cụm là gì
 * ---------
 * Tiếng Nhật cắt theo khúc chữ Hán / khúc kana — đúng cái ranh giới `catKhuc`
 * của kana.js dùng để đặt furigana, nên 伝統 の 酒 です ra bốn cụm gọn gàng.
 * Tiếng Anh, tiếng Việt thì cắt theo khoảng trắng. Dấu câu KHÔNG vào cụm nào:
 * phóng to một dấu 。 chẳng để làm gì mà lại làm câu giật.
 *
 * Câu đã có furigana thì mỗi <ruby> là một cụm nguyên vẹn — không được xé ruby
 * ra, xé là mất luôn phần đọc trên đỉnh chữ.
 *
 * Lời nhắc tập trung
 * ------------------
 * Cứ X phút kể từ lúc mở app, máy đọc to 「集中します」 (hoặc "Concentrate
 * please" khi đang học tiếng Anh). X = 0 là tắt. Đây chỉ là cái đồng hồ; việc
 * đọc to để bên gọi tự lo, vì app điện thoại đọc bằng plugin còn bản extension
 * đọc bằng speechSynthesis.
 */
(function (goc) {
  "use strict";

  const LA_HAN = /[㐀-䶿一-鿿〆々]/;
  /** Dấu câu và khoảng trắng: nằm ngoài mọi cụm. */
  const LA_DAU = /[\s、。，．・･！？!?,.…‥「」『』（）()\[\]【】〈〉《》〜~ー—–:;：；"'“”‘’|｜/／\\]/;

  /** Chữ ー là chữ kéo dài — nó thuộc về cụm kana đứng trước, không phải dấu. */
  function loai(c) {
    if (c === "ー") return "k";
    if (LA_DAU.test(c)) return "d";
    return LA_HAN.test(c) ? "h" : "k";
  }

  /**
   * Xé một đoạn chữ trần thành các mảnh.
   * @returns {Array<{t:string,dv:boolean}>} `dv` = mảnh này là một cụm chạy
   *   hiệu ứng; `false` là phần đệm (dấu câu, khoảng trắng) giữ nguyên tại chỗ.
   */
  function xeChu(text, ngu) {
    const t = String(text == null ? "" : text);
    const ra = [];
    if (!t) return ra;
    if (ngu !== "ja") {
      // Tách nhưng GIỮ khoảng trắng lại làm phần đệm, không thì các từ dính nhau.
      t.split(/(\s+)/).forEach((p) => { if (p) ra.push({ t: p, dv: !/^\s+$/.test(p) }); });
      return ra;
    }
    let cum = "", l = "";
    for (const c of t) {
      const lc = loai(c);
      if (cum && lc === l) { cum += c; continue; }
      if (cum) ra.push({ t: cum, dv: l !== "d" });
      cum = c; l = lc;
    }
    if (cum) ra.push({ t: cum, dv: l !== "d" });
    return ra;
  }

  /**
   * Bọc nội dung của một ô thành các cụm `<span class="nd-dv">`.
   * Giữ nguyên thứ tự và giữ nguyên mọi phần tử con (nhất là `<ruby>`).
   * @returns {Array<HTMLElement>} danh sách cụm, theo đúng thứ tự đọc.
   */
  function bocCum(o, ngu) {
    if (!o) return [];
    const con = Array.prototype.slice.call(o.childNodes);
    const ra = [];
    o.textContent = "";
    for (const n of con) {
      if (n.nodeType !== 3) {                       // <ruby> hoặc thẻ khác: trọn một cụm
        const s = o.ownerDocument.createElement("span");
        s.className = "nd-dv";
        s.appendChild(n);
        o.appendChild(s); ra.push(s);
        continue;
      }
      for (const manh of xeChu(n.nodeValue, ngu)) {
        if (!manh.dv) { o.appendChild(o.ownerDocument.createTextNode(manh.t)); continue; }
        const s = o.ownerDocument.createElement("span");
        s.className = "nd-dv";
        s.textContent = manh.t;
        o.appendChild(s); ra.push(s);
      }
    }
    return ra;
  }

  const TOC_MIN = 80, TOC_MAX = 2000;
  let may = null, cum = null, viTri = -1;

  /** Dừng hiệu ứng và trả các cụm về trạng thái thường. */
  function dung() {
    if (may) clearInterval(may);
    may = null; viTri = -1;
    if (cum) cum.forEach((s) => s.classList.remove("sang"));
    cum = null;
  }

  /**
   * Bật hiệu ứng trên một ô đã có sẵn nội dung.
   * @param {HTMLElement} o ô chứa câu (đã đặt chữ hoặc HTML ruby vào rồi)
   * @param {{ngu?:string, toc?:number}} [opt] `toc` = mili-giây mỗi cụm
   * @returns {number} số cụm; 0 là không chạy (câu chỉ có một cụm thì nhấp
   *   nháy chẳng nói lên điều gì, để yên còn dễ đọc hơn).
   */
  function batDau(o, opt) {
    dung();
    const c = opt || {};
    const ds = bocCum(o, c.ngu);
    if (ds.length < 2) return 0;
    cum = ds;
    const toc = Math.max(TOC_MIN, Math.min(TOC_MAX, Number(c.toc) || 320));
    const buoc = () => {
      if (viTri >= 0 && ds[viTri]) ds[viTri].classList.remove("sang");
      viTri = (viTri + 1) % ds.length;
      ds[viTri].classList.add("sang");
    };
    buoc();
    may = setInterval(buoc, toc);
    return ds.length;
  }

  function dangChay() { return !!may; }

  /* ------------------------------------------------------------------ */
  /* Lời nhắc tập trung                                                  */
  /* ------------------------------------------------------------------ */

  let mayNhac = null;

  /** Câu nhắc theo thứ tiếng đang học. */
  function loiNhac(ngu) { return ngu === "ja" ? "集中します" : "Concentrate please"; }

  /**
   * Hẹn giờ nhắc. Gọi lại hàm này là hẹn lại từ đầu — sửa số phút trong Cài đặt
   * thì mốc đếm chạy lại từ lúc bấm Lưu, không phải chờ nốt chu kỳ cũ.
   * @param {number} phut 0 hoặc âm là tắt hẳn
   * @param {Function} lam việc phải làm mỗi lần tới hẹn
   * @returns {boolean} có đang hẹn hay không
   */
  function datNhac(phut, lam) {
    if (mayNhac) clearInterval(mayNhac);
    mayNhac = null;
    const p = Number(phut) || 0;
    if (p <= 0 || typeof lam !== "function") return false;
    mayNhac = setInterval(lam, Math.round(p * 60000));
    return true;
  }

  function dangNhac() { return !!mayNhac; }

  goc.NhipDoc = { xeChu, bocCum, batDau, dung, dangChay, loiNhac, datNhac, dangNhac,
                  TOC_MIN, TOC_MAX };
})(typeof self !== "undefined" ? self : this);
