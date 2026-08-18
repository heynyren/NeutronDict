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

  /** Cả cụm nhiều từ: đổi từng từ, chỉ nhận khi đổi được HẾT. */
  function tuRomajiCum(raw) {
    const tu = String(raw || "").trim().split(/[\s　]+/).filter(Boolean);
    if (!tu.length) return "";
    const ra = [];
    for (const t of tu) {
      const k = tuRomaji(t);
      if (!k) return "";
      ra.push(k);
    }
    return ra.join("");
  }

  const KANA = /^[぀-ゟ゠-ヿーー\s]+$/;
  const CO_KANJI = /[㐀-䶿一-鿿]/;

  /** Từ này có cần suy cách đọc không: có kanji, và chưa có sẵn cách đọc. */
  function canDoc(word, reading) {
    if (reading && String(reading).trim()) return false;
    const w = String(word || "").trim();
    if (!w || w.length > 24) return false;      // câu dài thì furigana phải làm kiểu khác
    if (KANA.test(w)) return false;             // toàn kana rồi, không cần
    return CO_KANJI.test(w);
  }

  /** Từ toàn kana thì chính nó là cách đọc — khỏi gọi mạng. */
  function docSan(word) {
    const w = String(word || "").trim();
    return (w && KANA.test(w)) ? w : "";
  }

  goc.Kana = { tuRomaji, tuRomajiCum, canDoc, docSan, chuanRomaji };
})(typeof self !== "undefined" ? self : this);
