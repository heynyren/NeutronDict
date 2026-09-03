/**
 * Cổ vũ khi chấm bài — một câu nói và một tiếng chuông.
 * ===========================================================================
 *
 * Bấm Nhớ / Quên xong mà màn hình im phăng phắc thì ôn tập giống việc bàn giấy.
 * Có một tiếng đáp lại — 「すごいね」 khi nhớ, 「がんばって」 khi quên — thì mỗi
 * lượt bấm có một cái kết, ngồi lâu hơn được.
 *
 * Ba chuyện đáng nói:
 *
 * 1. Câu nói xoay vòng ngẫu nhiên. Một buổi học năm chục lượt bấm mà lượt nào
 *    cũng đúng một câu thì tới lượt thứ mười đã thành tiếng ồn.
 *
 * 2. Lượt QUÊN không mắng. 「がんばって」「だいじょうぶ」 — quên là chuyện bình
 *    thường của việc ôn tập, mà cái giọng răn dạy thì chỉ làm người ta chấm
 *    gian cho đẹp bảng.
 *
 * 3. Tiếng chuông DỰNG BẰNG WebAudio, không kèm tệp mp3 nào. Extension nhét
 *    thêm mấy tệp âm là phình gói cài, mà lấy từ CDN thì mất mạng là im tiếng —
 *    trong khi hai tiếng chuông này chỉ là ba nốt sin, dựng tại chỗ, chạy được
 *    cả khi máy bay.
 *
 * Còn giọng đọc: `giongTot()` chấm điểm các giọng máy đang có rồi chọn giọng
 * nghe giống người nhất, vì thứ tự mặc định của trình duyệt hay trả về giọng
 * nén nhỏ (compact / espeak) nghe rất "robot".
 */
(function (goc) {
  "use strict";

  const LOI = {
    ja: {
      nho:  ["すごいね", "よくできました", "いいね", "そのとおり", "やったね"],
      quen: ["がんばって", "だいじょうぶ", "つぎはいけるよ", "もういちど"]
    },
    en: {
      nho:  ["Nice one", "Well done", "That's right", "Great"],
      quen: ["Keep going", "You'll get it", "Almost there", "One more time"]
    }
  };

  /**
   * Câu cổ vũ cho một lượt chấm.
   * @param {boolean} nho lượt Nhớ hay lượt Quên
   * @param {string} [ngu] "ja" | "en"
   */
  function loi(nho, ngu) {
    const b = LOI[ngu === "ja" ? "ja" : "en"];
    const ds = nho ? b.nho : b.quen;
    return ds[Math.floor(Math.random() * ds.length)];
  }

  /* ------------------------------------------------------------------ */
  /* Chọn giọng                                                         */
  /* ------------------------------------------------------------------ */

  /** Giọng có tên riêng của hãng — gần như luôn là giọng thu thật, không phải giọng nén. */
  const TEN_NGUOI = /kyoko|nanami|otoya|ayumi|haruka|sayaka|mizuki|takumi|keita|ichiro|samantha|aria|jenny|guy/i;

  function diemGiong(v) {
    const t = String(v.name || "").toLowerCase();
    let d = 0;
    if (/natural|neural|premium|enhanced/.test(t)) d += 8;   // giọng thế hệ mới, nghe rõ là người
    if (/google/.test(t)) d += 6;                            // giọng mạng của Chrome, tự nhiên nhất trong nhóm sẵn có
    if (TEN_NGUOI.test(t)) d += 4;
    if (/microsoft/.test(t)) d += 1;
    if (/compact|espeak|pico|robo/.test(t)) d -= 8;          // đây mới là thứ nghe như máy đọc thẻ
    if (v.localService === false) d += 2;
    if (v.default) d += 1;
    return d;
  }

  /**
   * Giọng nghe tự nhiên nhất trong số giọng máy đang có cho thứ tiếng này.
   * @param {string} ngu "ja" | "en" | "vi"
   * @param {Array} ds danh sách từ speechSynthesis.getVoices()
   * @returns {object|null} null nếu máy không có giọng thứ tiếng đó
   */
  function giongTot(ngu, ds) {
    const ma = String(ngu || "").slice(0, 2).toLowerCase();
    const co = (ds || []).filter((v) => {
      const l = String(v.lang || "").toLowerCase().replace(/_/g, "-");
      return l === ma || l.indexOf(ma + "-") === 0;
    });
    if (!co.length) return null;
    return co.slice().sort((a, b) => diemGiong(b) - diemGiong(a))[0];
  }

  /* ------------------------------------------------------------------ */
  /* Tiếng chuông                                                       */
  /* ------------------------------------------------------------------ */

  let may = null;

  function moMay() {
    if (may) return may;
    const M = goc.AudioContext || goc.webkitAudioContext;
    if (!M) return null;
    try { may = new M(); } catch (e) { may = null; }
    return may;
  }

  /**
   * Nhớ  → ba nốt đi lên (mi-sol-đô), nghe như một tiếng "xong rồi!".
   * Quên → hai nốt đi xuống, trầm và êm: nhắc chứ không phạt.
   * @returns {boolean} có phát được không (máy không cho WebAudio thì false)
   */
  function chuong(nho) {
    const c = moMay();
    if (!c) return false;
    // Trình duyệt treo máy âm cho tới lần bấm đầu tiên; bấm Nhớ/Quên chính là
    // cái bấm đó nên gọi resume ở đây là đúng lúc.
    if (c.state === "suspended" && c.resume) { try { c.resume(); } catch (e) {} }

    const not = nho ? [659.25, 783.99, 1046.50] : [349.23, 261.63];
    const buoc = nho ? 0.085 : 0.135;
    const dinh = nho ? 0.16 : 0.11;
    const dai = nho ? 0.34 : 0.44;
    const t0 = c.currentTime + 0.01;

    not.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = t0 + i * buoc;
      // Lên tiếng nhanh rồi tắt dần theo hàm mũ — đó là dáng của một tiếng gõ
      // thật; cắt phẳng thì nghe "tách" một cái rất khó chịu.
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(dinh, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0006, t + dai);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dai + 0.05);
    });
    return true;
  }

  /** Khoảng chờ trước khi đọc, để tiếng chuông kịp vang xong phần đầu. */
  const CHO_NOI = 170;

  goc.CoVu = { loi, giongTot, diemGiong, chuong, CHO_NOI };
})(typeof self !== "undefined" ? self : this);
