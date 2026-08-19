/**
 * Suy cách đọc (furigana) cho từ tiếng Nhật khi từ điển không cho.
 *
 * Vì sao cần: Mazii trả về cách đọc cho phần lớn từ, nhưng KHÔNG phải tất cả —
 * và một mục nằm trong sổ tay mà không có furigana thì đến lúc ôn lại chẳng
 * đọc nổi. Nguồn duy nhất còn lại mà mình đã có sẵn đường đi tới là bản phiên
 * âm La-tinh của Google (tham số dt=rm), nên việc ở đây là đổi romaji ngược lại
 * thành hiragana.
 *
 * Nói thẳng giới hạn: đây là cách đọc SUY RA, không phải tra từ điển. Romaji đã
 * đánh mất một phần thông tin — "ō" có thể là おう hoặc おお, "ē" có thể là えい
 * hoặc ええ — nên chỗ nào phải chọn thì tệp này chọn phương án phổ biến hơn và
 * đánh dấu mục đó là suy ra, để giao diện nói rõ với người đọc.
 */
(function (goc) {
  "use strict";

  /* Bảng âm tiết, xếp để khớp CHUỖI DÀI TRƯỚC (kyo trước ky trước k). */
  const AM = {
    kya: "きゃ", kyu: "きゅ", kyo: "きょ", kye: "きぇ",
    gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
    sha: "しゃ", shu: "しゅ", sho: "しょ", she: "しぇ", shi: "し",
    ja: "じゃ", ju: "じゅ", jo: "じょ", je: "じぇ", ji: "じ",
    cha: "ちゃ", chu: "ちゅ", cho: "ちょ", che: "ちぇ", chi: "ち",
    tsu: "つ", tsa: "つぁ", tso: "つぉ",
    nya: "にゃ", nyu: "にゅ", nyo: "にょ",
    hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
    bya: "びゃ", byu: "びゅ", byo: "びょ",
    pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
    mya: "みゃ", myu: "みゅ", myo: "みょ",
    rya: "りゃ", ryu: "りゅ", ryo: "りょ",
    fa: "ふぁ", fi: "ふぃ", fe: "ふぇ", fo: "ふぉ", fu: "ふ",
    va: "ゔぁ", vi: "ゔぃ", ve: "ゔぇ", vo: "ゔぉ",
    ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
    ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
    sa: "さ", su: "す", se: "せ", so: "そ",
    za: "ざ", zu: "ず", ze: "ぜ", zo: "ぞ",
    ta: "た", te: "て", to: "と", ti: "てぃ", tu: "とぅ",
    da: "だ", de: "で", do: "ど", di: "でぃ", du: "どぅ",
    na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
    ha: "は", hi: "ひ", he: "へ", ho: "ほ",
    ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
    pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
    ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
    ya: "や", yu: "ゆ", yo: "よ",
    ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
    wa: "わ", wo: "を", we: "うぇ", wi: "うぃ",
    a: "あ", i: "い", u: "う", e: "え", o: "お"
  };
  const KHOA = Object.keys(AM).sort((x, y) => y.length - x.length);

  /** Nguyên âm dài viết bằng dấu ngang trên: Tōkyō, gakkō… */
  const DAI = { "ā": "aa", "ī": "ii", "ū": "uu", "ē": "ei", "ō": "ou" };

  /** Chuẩn hoá romaji: bỏ dấu ngang trên, đưa về chữ thường. */
  function chuanRomaji(s) {
    let r = String(s || "").toLowerCase();
    for (const k in DAI) r = r.split(k).join(DAI[k]);
    // Vài bản phiên âm dùng "ou"/"oo" sẵn, giữ nguyên; "â" kiểu khác thì bỏ dấu.
    return r.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  /**
   * Đổi một từ romaji thành hiragana. Trả về "" nếu gặp thứ không đọc được —
   * thà không có furigana còn hơn có furigana bịa.
   */
  function tuRomaji(raw) {
    const s = chuanRomaji(raw).replace(/[^a-z']/g, "");
    if (!s) return "";
    let ra = "", i = 0;
    while (i < s.length) {
      const c = s[i], sau = s[i + 1];

      // Phụ âm đôi -> っ (gakkou -> がっこう). "nn" không tính, đó là ん + な hàng.
      if (c === sau && "kgsztdhbpmyrwfjc".indexOf(c) >= 0) { ra += "っ"; i += 1; continue; }

      // n đứng trước phụ âm hoặc cuối từ -> ん. "n'" cũng vậy (nhật ký: kon'ya).
      if (c === "n" && (!sau || sau === "'" || "aiueoy".indexOf(sau) < 0)) {
        ra += "ん"; i += (sau === "'" ? 2 : 1); continue;
      }

      let khop = "";
      for (const k of KHOA) { if (s.startsWith(k, i)) { khop = k; break; } }
      if (!khop) return "";          // có ký tự lạ -> bỏ cuộc, không đoán bừa
      ra += AM[khop]; i += khop.length;
    }
    return ra;
  }

  /**
   * Cả cụm nhiều từ: đổi từng từ, chỉ nhận khi đổi được HẾT.
   *
   * Ngoại lệ: khúc chẳng có chữ cái nào — dấu câu "、", chữ số "2024" — thì BỎ
   * QUA chứ không coi là thất bại. Một câu lời thoại gần như câu nào cũng có
   * dấu câu; bắt lỗi ở đó thì cả câu không bao giờ ra được cách đọc.
   */
  function tuRomajiCum(raw) {
    const tu = String(raw || "").trim().split(/[\s　]+/).filter(Boolean);
    if (!tu.length) return "";
    const ra = [];
    for (const t of tu) {
      const k = tuRomaji(t);
      if (!k) {
        if (!/[a-zāīūēōâîûêô]/i.test(chuanRomaji(t))) continue;   // toàn dấu câu / chữ số
        return "";
      }
      ra.push(k);
    }
    return ra.join("");
  }

  const KANA = /^[぀-ゟ゠-ヿーー\s]+$/;
  /** Cách đọc do Mazii trả về đôi khi là romaji ("Ubawa remasu") chứ không phải kana. */
  const ROMAJI = /^[A-Za-zāīūēōâîûêôĀĪŪĒŌ'’\-\s.]+$/;
  function laRomaji(s) {
    const x = String(s || "").trim();
    return !!x && ROMAJI.test(x) && /[A-Za-zāīūēō]/.test(x);
  }

  const CO_KANJI = /[㐀-䶿一-鿿]/;

  /** Từ này có cần suy cách đọc không: có kanji, và chưa có sẵn cách đọc. */
  function canDoc(word, reading) {
    if (reading && String(reading).trim()) return false;
    const w = String(word || "").trim();
    // Cắt ở 12 chữ: từ ghép tiếng Nhật gần như không bao giờ dài hơn thế, còn
    // cái dài hơn thì là CÂU — mà furigana cho cả câu phải đặt trên từng từ
    // một, không phải một dòng kana chạy dài dưới câu.
    if (!w || Array.from(w).length > 12) return false;
    if (KANA.test(w)) return false;             // toàn kana rồi, không cần
    return CO_KANJI.test(w);
  }

  /** Từ toàn kana thì chính nó là cách đọc — khỏi gọi mạng. */
  function docSan(word) {
    const w = String(word || "").trim();
    return (w && KANA.test(w)) ? w : "";
  }


  /* ==================================================================== */
  /* Furigana cho CẢ CÂU                                                  */
  /* ==================================================================== */
  /*
   * Một câu lời thoại thì không thể có "một dòng kana chạy dài ở dưới" — đọc
   * kiểu đó còn mệt hơn đọc chữ Hán. Cách đọc của câu phải nằm ĐÚNG TRÊN chữ
   * Hán sinh ra nó, tức là ruby.
   *
   * Nhưng thứ mình xin được chỉ là kana của CẢ CÂU (đổi từ romaji của Google).
   * Vậy việc còn lại là canh: phần kana đã có sẵn trong câu chính là các CỌC
   * MỐC. Câu 迷いいただけるところから với cách đọc まよいいただけるところから —
   * cọc mốc "いいただけるところから" nằm ở vị trí 3, nên 迷 = まよ. Không cần
   * biết ngữ pháp, chỉ cần trừ đi phần đã biết.
   *
   * Canh không khớp thì TRẢ VỀ RỖNG. Furigana đặt sai chỗ còn tệ hơn không có.
   */

  /** Katakana -> hiragana, để so được với bản kana đổi từ romaji. */
  function veHira(s) {
    let r = "";
    for (const c of String(s || "")) {
      const m = c.codePointAt(0);
      r += (m >= 0x30a1 && m <= 0x30f6) ? String.fromCodePoint(m - 0x60) : c;
    }
    return r;
  }

  /** Nguyên âm của từng chữ kana, để nở dấu kéo dài ー ra thành nguyên âm. */
  const NGUYEN = {
    a: "あかさたなはまやらわがざだばぱゃゎぁかゕ",
    i: "いきしちにひみりぎじぢびぴぃ",
    u: "うくすつぬふむゆるぐずづぶぷゅぅっ",
    e: "えけせてねへめれげぜでべぺぇゖ",
    o: "おこそとのほもよろをごぞどぼぽょぉ"
  };
  const VE_NGUYEN = { a: "あ", i: "い", u: "う", e: "え", o: "お" };
  function nguyenCua(c) {
    for (const k in NGUYEN) if (NGUYEN[k].indexOf(c) >= 0) return k;
    return "";
  }

  /**
   * Đưa một chuỗi kana về DẠNG SO SÁNH. Áp cho cả hai bên nên phép đổi nào cũng
   * an toàn, miễn là đổi giống nhau:
   *   - katakana -> hiragana, ー -> nguyên âm đứng trước
   *   - は/へ/を -> わ/え/お  (Google phiên âm trợ từ theo cách ĐỌC, "wa" chứ
   *     không phải "ha"; đổi cả hai bên thì 花 はな vẫn khớp)
   *   - づ/ぢ -> ず/じ        (romaji không phân biệt)
   *   - bỏ hết dấu câu, khoảng trắng, chữ số, chữ La-tinh
   */
  function soSanh(s) {
    let r = veHira(s);
    let ra = "";
    for (const c of r) {
      if (c === "ー" || c === "－" || c === "—") {
        const v = nguyenCua(ra.slice(-1));
        if (v) ra += VE_NGUYEN[v];
        continue;
      }
      ra += c;
    }
    ra = ra.split("は").join("わ").split("へ").join("え").split("を").join("お")
           .split("づ").join("ず").split("ぢ").join("じ");
    return ra.replace(/[^ぁ-ゖ]/g, "");
  }

  const LA_HAN = /[㐀-䶿一-鿿〆々]/;

  /** Cắt câu thành các khúc: khúc chữ Hán và khúc không phải chữ Hán. */
  function catKhuc(text) {
    const ds = [];
    for (const c of String(text || "")) {
      const han = LA_HAN.test(c);
      const cuoi = ds[ds.length - 1];
      if (cuoi && cuoi.han === han) cuoi.t += c;
      else ds.push({ t: c, han: han });
    }
    return ds;
  }

  /**
   * Ghép furigana cho một câu.
   * @param {string} text  câu gốc
   * @param {string} doc   cách đọc kana của CẢ câu
   * @returns {Array<{t:string,r?:string}>} các khúc; khúc có `r` là khúc cần
   *   đặt furigana. Trả về [] nếu canh không khớp.
   */
  function ghepFurigana(text, doc) {
    const khuc = catKhuc(text);
    if (!khuc.length) return [];
    if (!khuc.some((k) => k.han)) return [];        // không có chữ Hán thì khỏi ruby
    const d = soSanh(doc);
    if (!d) return [];

    const ra = [];
    let j = 0;                                       // đang đọc tới đâu trong cách đọc
    for (let i = 0; i < khuc.length; i++) {
      const k = khuc[i];
      if (!k.han) {
        const c = soSanh(k.t);
        if (c) {
          if (d.startsWith(c, j)) j += c.length;
          else return [];                            // cọc mốc không khớp -> bỏ cuộc
        }
        ra.push({ t: k.t });
        continue;
      }
      // Khúc chữ Hán: phần đọc của nó là khoảng từ đây tới cọc mốc kế tiếp.
      const sau = khuc[i + 1];
      let het;
      if (!sau) het = d.length;                      // chữ Hán nằm cuối câu
      else {
        const moc = soSanh(sau.t);
        if (!moc) {                                  // khúc sau chỉ có dấu câu: gộp tiếp
          let n = i + 2, m = "";
          while (n < khuc.length && !khuc[n].han && !(m = soSanh(khuc[n].t))) n++;
          het = m ? d.indexOf(m, j + 1) : d.length;
        } else het = d.indexOf(moc, j + 1);
      }
      if (het < 0 || het <= j) return [];            // không tìm ra mốc, hoặc chữ Hán đọc rỗng
      ra.push({ t: k.t, r: d.slice(j, het) });
      j = het;
    }
    if (j !== d.length) return [];                   // còn dư cách đọc -> canh sai ở đâu đó
    return ra;
  }

  /**
   * Rút gọn kết quả ghép để CẤT: chỉ cần cách đọc của các khúc chữ Hán, theo
   * đúng thứ tự. Câu gốc đã nằm ở `word` rồi, chép lại nguyên câu vào sổ tay
   * lần nữa chỉ tổ nặng đường đồng bộ — mà lại còn có nguy cơ lệch với `word`.
   */
  function gonRuby(khuc) {
    return (khuc || []).filter((k) => k.r).map((k) => k.r);
  }

  /** Dựng lại các khúc để VẼ, từ câu gốc + danh sách cách đọc đã cất. */
  function dungRuby(text, ds) {
    const doc = ds || [];
    if (!doc.length) return [];
    const khuc = catKhuc(text);
    let i = 0;
    const ra = khuc.map((k) => (k.han ? { t: k.t, r: doc[i++] || "" } : { t: k.t }));
    if (i !== doc.length) return [];      // số khúc chữ Hán không khớp -> đừng vẽ lệch
    return ra;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /**
   * HTML <ruby> cho một câu đã ghép furigana. Trả về "" nếu không dựng được —
   * chỗ gọi cứ hiện câu trơn như cũ.
   */
  function htmlRuby(text, ds) {
    const khuc = dungRuby(text, ds);
    if (!khuc.length) return "";
    return khuc.map((k) => (k.r
      ? "<ruby>" + esc(k.t) + "<rt>" + esc(k.r) + "</rt></ruby>"
      : esc(k.t))).join("");
  }

  goc.Kana = { tuRomaji, tuRomajiCum, canDoc, docSan, chuanRomaji, laRomaji,
                ghepFurigana, gonRuby, dungRuby, htmlRuby, catKhuc, soSanh, veHira };
})(typeof self !== "undefined" ? self : this);
